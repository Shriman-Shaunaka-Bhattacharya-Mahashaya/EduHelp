import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../auth/[...nextauth]/route';
import connectDB from '../../../../lib/mongodb';
import Content from '../../../../models/Content';
import User from '../../../../models/User';
import { generateEmbedding } from '../../../../lib/embeddings';

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'student') {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();
    
    const user = await User.findById(session.user.id);
    if (!user) return NextResponse.json({ message: 'User not found' }, { status: 404 });

    const department = user.department;
    const graduationYear = user.graduationYear;

    const url = new URL(req.url);
    const searchQuery = url.searchParams.get('search');
    const page = parseInt(url.searchParams.get('page') || '1');
    const limit = parseInt(url.searchParams.get('limit') || '5');
    const skip = (page - 1) * limit;

    const course = url.searchParams.get('course');

    const baseQuery: any = {
      $and: [
        {
          $or: [
            { targetDepartment: { $in: [null, department, ""] } },
            { targetBatch: { $in: [null, graduationYear] } },
          ]
        },
        { expireAt: { $gt: new Date() } }
      ]
    };

    if (course) {
      baseQuery.course = course;
    }

    let content = [];
    let hasMore = false;

    if (searchQuery) {
      // Vector Search
      let queryEmbedding: number[] = [];
      try {
        queryEmbedding = await generateEmbedding(searchQuery);
      } catch (e) {
        console.error("Failed to embed search query:", e);
      }

      if (queryEmbedding.length > 0) {
        const deptFilter = department ? [department, ""] : [""];
        const batchFilter = graduationYear ? [graduationYear] : [];

        // Prepare the filter for $vectorSearch
        const vectorFilter: any = {
          $and: [
            {
              $or: [
                { targetDepartment: { $exists: false } },
                { targetDepartment: { $in: deptFilter } },
                { targetBatch: { $exists: false } }
              ]
            },
            { expireAt: { $gt: new Date() } }
          ]
        };
        
        if (batchFilter.length > 0) {
          vectorFilter.$and[0].$or.push({ targetBatch: { $in: batchFilter } });
        }

        if (course) {
          vectorFilter.course = course;
        }

        const pipeline = [
          {
            $vectorSearch: {
              index: "ContentVectorIndex",
              path: "embedding",
              queryVector: queryEmbedding,
              numCandidates: 100,
              limit: skip + limit,
              filter: vectorFilter
            }
          },
          { $skip: skip },
          { $limit: limit }
        ];

        content = await Content.aggregate(pipeline);
        await Content.populate(content, { path: 'instructorId', select: 'fullName email' });
        
        // Count for hasMore (since we don't have totalDocs from aggregate easily without $facet)
        // We can just check if we got `limit` number of results
        hasMore = content.length === limit;
      }
    } else {
      // Normal find
      const normalBaseQuery: any = {
        $and: [
          {
            $or: [
              { targetDepartment: { $in: [null, department, ""] } },
              { targetBatch: { $in: [null, graduationYear] } },
              { targetDepartment: { $exists: false } },
              { targetBatch: { $exists: false } }
            ]
          },
          { expireAt: { $gt: new Date() } }
        ]
      };
      if (course) normalBaseQuery.course = course;

      const queryObj = Content.find(normalBaseQuery)
        .populate('instructorId', 'fullName email')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit);

      content = await queryObj;
      const totalDocs = await Content.countDocuments(normalBaseQuery);
      hasMore = totalDocs > skip + limit;
    }

    return NextResponse.json({ content, hasMore }, { status: 200 });

  } catch (error: any) {
    console.error('Fetch Student Content Error:', error);
    return NextResponse.json({ message: 'Server error', error: error.message }, { status: 500 });
  }
}

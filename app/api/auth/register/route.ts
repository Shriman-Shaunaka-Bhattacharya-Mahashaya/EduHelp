import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import connectToDatabase from '@/lib/mongodb';
import User from '@/models/User';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const {
      email,
      password,
      role,
      fullName,
      department,
      registrationNumber,
      rollNumber,
      section,
      graduationYear,
      instructorId,
    } = body;

    // Validate generic required fields
    if (!email || !password || !role || !fullName || !department) {
      return NextResponse.json({ message: 'Missing required common fields' }, { status: 400 });
    }

    await connectToDatabase();

    // Check if user already exists
    const userExists = await User.findOne({ email });
    if (userExists) {
      return NextResponse.json({ message: 'User already exists with this email' }, { status: 400 });
    }

    // Role-specific validation
    if (role === 'student') {
      if (!registrationNumber || !rollNumber || !graduationYear) {
        return NextResponse.json({ message: 'Missing required student fields' }, { status: 400 });
      }
    } else if (role === 'instructor') {
      if (!instructorId) {
        return NextResponse.json({ message: 'Missing required instructor fields' }, { status: 400 });
      }
    } else {
      return NextResponse.json({ message: 'Invalid role' }, { status: 400 });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Create user
    const newUser = await User.create({
      email,
      password: hashedPassword,
      role,
      fullName,
      department,
      ...(role === 'student' && { registrationNumber, rollNumber, section, graduationYear }),
      ...(role === 'instructor' && { instructorId }),
    });

    return NextResponse.json({ message: 'User registered successfully', userId: newUser._id }, { status: 201 });
  } catch (error: any) {
    console.error('Registration Error:', error);
    return NextResponse.json({ message: 'Server error', error: error.message }, { status: 500 });
  }
}

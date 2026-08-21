"use client";

import { useSession } from "next-auth/react";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState, useRef, useCallback } from "react";
// Remove top-level import to fix SSR 'document is not defined' error

export default function ClassMeetingRoom() {
  const { data: session, status } = useSession();
  const params = useParams<{ meetingId: string }>();
  const router = useRouter();
  
  const [classId, setClassId] = useState<string | null>(null);
  const [classTitle, setClassTitle] = useState<string>("Online Class");
  const [zegoAppId, setZegoAppId] = useState<number | null>(null);
  const [zegoToken, setZegoToken] = useState<string | null>(null);
  const [zegoUserId, setZegoUserId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
    }
  }, [status, router]);

  useEffect(() => {
    async function resolveParams() {
      const unwrappedParams = await params;
      setClassId(unwrappedParams.meetingId);
    }
    resolveParams();
  }, [params]);

  useEffect(() => {
    if (!classId || status !== "authenticated") return;

    // Fetch the class to verify it exists and is ongoing (for students)
    const verifyClass = async () => {
      try {
        const res = await fetch(`/api/classes/${classId}`);
        const data = await res.json();
        if (res.ok) {
          setClassTitle(data.title || "Online Class");
          if (!data.token || !data.appID || !data.userID) {
            setError("The backend did not provide a secure ZegoCloud token.");
          } else {
            setZegoAppId(parseInt(data.appID));
            setZegoToken(data.token);
            setZegoUserId(data.userID);
          }
        } else {
          setError(data.message || "Failed to load class");
        }
      } catch (e: any) {
        setError(e.message);
      }
    };

    verifyClass();
  }, [classId, status]);

  const joinRoom = useCallback(async () => {
    if (!classId || !session?.user || !containerRef.current) return;
    if (!zegoToken || !zegoAppId || !zegoUserId) return;

    try {
      // Dynamically import ZegoUIKitPrebuilt to prevent SSR errors
      const { ZegoUIKitPrebuilt } = await import("@zegocloud/zego-uikit-prebuilt");

      // Build the final kit token for production without exposing the server secret
      const kitToken = ZegoUIKitPrebuilt.generateKitTokenForProduction(
        zegoAppId,
        zegoToken,
        classId, // Room ID
        zegoUserId, // User ID MATCHES EXACTLY
        session.user.name || "Student" // User Name
      );

      const zp = ZegoUIKitPrebuilt.create(kitToken);

      zp.joinRoom({
        container: containerRef.current,
        sharedLinks: [],
        scenario: {
          mode: ZegoUIKitPrebuilt.VideoConference,
        },
        onLeaveRoom: async () => {
          if (session?.user?.role === 'instructor') {
            const confirmEnd = window.confirm("Do you want to officially end this class for all students?");
            if (confirmEnd) {
              try {
                await fetch(`/api/instructor/classes/${classId}`, {
                  method: 'PUT',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ status: 'completed' })
                });
              } catch (e) {
                console.error("Failed to end class", e);
              }
            }
          }
          router.push('/dashboard');
        }
      });
    } catch (e: any) {
      console.error("Zego Initialization Error:", e);
      setError("Failed to initialize video interface.");
    }
  }, [classId, session, router, zegoToken, zegoAppId, zegoUserId]);

  // Trigger joinRoom when credentials are loaded and container is ready
  useEffect(() => {
    if (zegoToken && zegoAppId && zegoUserId && containerRef.current) {
      joinRoom();
    }
  }, [zegoToken, zegoAppId, zegoUserId, joinRoom]);

  if (error) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', height: '100vh', background: '#000', color: 'var(--danger)' }}>
        <h2>Error joining class</h2>
        <p>{error}</p>
        <button onClick={() => router.push('/dashboard')} className="btn-primary" style={{ marginTop: '1rem' }}>Return to Dashboard</button>
      </div>
    );
  }

  // Show loading state until token is fetched from backend
  if (status === "loading" || !classId || !zegoToken || !zegoAppId || !zegoUserId) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', height: '100vh', background: '#000', color: '#fff' }}>
        <div className="spinner"></div>
        <div style={{ marginTop: '1rem' }}>Preparing Secure Video Room...</div>
      </div>
    );
  }

  return (
    <div style={{ width: '100vw', height: '100vh', background: '#000' }}>
      <div ref={containerRef} style={{ width: '100%', height: '100%' }}></div>
    </div>
  );
}

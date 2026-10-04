"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type FriendRequest = {
  id: number;
  otherUserId: number;
  otherName: string;
  otherProfilePhotoPath: string | null;
};

type Friend = {
  userId: number;
  name: string;
  profilePhotoPath: string | null;
};

type SearchResult = {
  id: number;
  name: string;
  profilePhotoPath: string | null;
};

type FriendsClientProps = {
  initialFriends: Friend[];
  initialIncoming: FriendRequest[];
  initialOutgoing: FriendRequest[];
};

// Real backend: src/app/api/friends/* (requests, accept/decline, list,
// unfriend) and src/app/api/users/search, backed by the
// friend_requests/friendships tables in src/lib/db.ts.
export default function FriendsClient({
  initialFriends,
  initialIncoming,
  initialOutgoing,
}: FriendsClientProps) {
  const router = useRouter();
  const [friends, setFriends] = useState(initialFriends);
  const [incoming, setIncoming] = useState(initialIncoming);
  const [outgoing, setOutgoing] = useState(initialOutgoing);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    if (query.trim().length < 2) return;
    setSearching(true);
    setError(null);
    try {
      const res = await fetch(`/api/users/search?q=${encodeURIComponent(query.trim())}`);
      const data = await res.json();
      setResults(data.users || []);
    } catch {
      setError("Couldn't reach the server.");
    } finally {
      setSearching(false);
    }
  }

  async function sendRequest(recipientId: number) {
    setError(null);
    try {
      const res = await fetch("/api/friends/requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ recipientId }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Couldn't send that friend request.");
        return;
      }
      setOutgoing((prev) => [...prev, data.request]);
      setResults((prev) => prev.filter((r) => r.id !== recipientId));
    } catch {
      setError("Couldn't reach the server.");
    }
  }

  async function respond(requestId: number, accept: boolean) {
    setError(null);
    try {
      const res = await fetch(`/api/friends/requests/${requestId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accept }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Couldn't respond to that request.");
        return;
      }
      setIncoming((prev) => prev.filter((r) => r.id !== requestId));
      if (accept) {
        setFriends((prev) => [
          ...prev,
          { userId: data.request.otherUserId, name: data.request.otherName, profilePhotoPath: data.request.otherProfilePhotoPath },
        ]);
      }
      router.refresh();
    } catch {
      setError("Couldn't reach the server.");
    }
  }

  async function unfriend(userId: number) {
    setError(null);
    try {
      const res = await fetch(`/api/friends/${userId}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Couldn't remove that friend.");
        return;
      }
      setFriends((prev) => prev.filter((f) => f.userId !== userId));
    } catch {
      setError("Couldn't reach the server.");
    }
  }

  return (
    <div>
      {error && (
        <div className="central-meta item">
          <p role="alert" style={{ color: "#c0392b", padding: 16, margin: 0 }}>{error}</p>
        </div>
      )}

      <div className="central-meta item">
        <div style={{ padding: 20 }}>
          <h4 style={{ marginBottom: 12 }}>Find friends</h4>
          <form method="post" onSubmit={handleSearch} style={{ display: "flex", gap: 8 }}>
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by name or username"
              style={{ flex: 1, padding: "8px 12px", border: "1px solid #ddd", borderRadius: 4 }}
            />
            <button className="mtr-btn signup" type="submit" disabled={searching || query.trim().length < 2}>
              <span>{searching ? "Searching…" : "Search"}</span>
            </button>
          </form>
          {results.length > 0 && (
            <ul className="naves" style={{ marginTop: 12 }}>
              {results.map((r) => (
                <li key={r.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <span>{r.name}</span>
                  <button className="mtr-btn signin" type="button" onClick={() => sendRequest(r.id)}>
                    <span>Add Friend</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {incoming.length > 0 && (
        <div className="central-meta item">
          <div style={{ padding: 20 }}>
            <h4 style={{ marginBottom: 12 }}>Friend requests</h4>
            {incoming.map((r) => (
              <div
                key={r.id}
                style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 0" }}
              >
                <span>{r.otherName}</span>
                <div style={{ display: "flex", gap: 8 }}>
                  <button className="mtr-btn signup" type="button" onClick={() => respond(r.id, true)}>
                    <span>Accept</span>
                  </button>
                  <button className="mtr-btn signin" type="button" onClick={() => respond(r.id, false)}>
                    <span>Decline</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {outgoing.length > 0 && (
        <div className="central-meta item">
          <div style={{ padding: 20 }}>
            <h4 style={{ marginBottom: 12 }}>Pending requests you sent</h4>
            {outgoing.map((r) => (
              <div key={r.id} style={{ padding: "4px 0", color: "#666" }}>
                {r.otherName} — waiting for a response
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="central-meta item">
        <div style={{ padding: 20 }}>
          <h4 style={{ marginBottom: 12 }}>
            Friends {friends.length > 0 ? `(${friends.length})` : ""}
          </h4>
          {friends.length === 0 && <p style={{ color: "#888" }}>No friends yet — search above to add some.</p>}
          {friends.map((f) => (
            <div
              key={f.userId}
              style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 0" }}
            >
              <span>{f.name}</span>
              <div style={{ display: "flex", gap: 8 }}>
                <a className="mtr-btn signin" href={`/messages?to=${f.userId}`}>
                  <span>Message</span>
                </a>
                <button className="mtr-btn signin" type="button" onClick={() => unfriend(f.userId)}>
                  <span>Unfriend</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

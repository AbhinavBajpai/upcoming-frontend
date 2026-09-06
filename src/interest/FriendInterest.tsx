import { useContext } from "react";
import { Link } from "react-router-dom";
import { Users } from "lucide-react";
import { InterestContext } from "./context";
export function FriendInterest({
  filmId,
  title,
}: {
  filmId: string;
  title: string;
}) {
  const friends = useContext(InterestContext)[filmId] ?? [];
  if (!friends.length) return null;
  return (
    <div
      className="friend-interest"
      aria-label={`Friends who want to watch ${title}`}
    >
      <Users size={18} aria-hidden="true" />
      {friends.length <= 2 ? (
        <p>
          {friends.map((friend, index) => (
            <span key={friend.id}>
              {index ? " and " : ""}
              <Link to={`/friends/${encodeURIComponent(friend.id)}`}>
                {friend.displayName}
              </Link>
            </span>
          ))}{" "}
          {friends.length === 1 ? "wants" : "want"} to watch
        </p>
      ) : (
        <details>
          <summary>
            {friends.length} friends want to watch{" "}
            <span className="sr-only">{title} — show names</span>
          </summary>
          <ul>
            {friends.map((friend) => (
              <li key={friend.id}>
                <Link to={`/friends/${encodeURIComponent(friend.id)}`}>
                  {friend.displayName}
                </Link>
              </li>
            ))}
          </ul>
        </details>
      )}
    </div>
  );
}

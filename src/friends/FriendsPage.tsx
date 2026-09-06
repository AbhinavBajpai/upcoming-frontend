import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { Link, useParams } from "react-router-dom";
import { Check, Copy, Users, UserPlus } from "lucide-react";
import { useAccount } from "../accounts/context";
import { createFriendState } from "./store";
import type { Connection, FriendProfile } from "./api";
import { WatchListSections } from "../stars/WatchListSections";

export function FriendsPage() {
  const { user, loading } = useAccount(),
    { userId } = useParams();
  return (
    <section className="friends-page" aria-labelledby="friends-title">
      <h1 className="page-heading" id="friends-title">
        Friends
      </h1>
      {loading ? (
        <p role="status">Checking your account…</p>
      ) : !user ? (
        <SignIn target={userId} />
      ) : (
        <FriendContent
          key={`${user.id}/${userId ?? ""}`}
          ownId={user.id}
          target={userId}
        />
      )}
      <p className="friends-back">
        <Link className="text-link" to="/releases">
          Back to releases
        </Link>
      </p>
    </section>
  );
}
function SignIn({ target }: { target?: string }) {
  const path = target ? `/friends/${encodeURIComponent(target)}` : "/friends";
  return (
    <div className="empty-state">
      <Users size={28} aria-hidden="true" />
      <h2>Sign in to view friends</h2>
      <p>
        Sign in to connect with friends. You’ll both be able to see each other’s
        watch lists once a request is accepted.
      </p>
      <Link
        className="action-button"
        to={`/login?returnTo=${encodeURIComponent(path)}`}
      >
        Sign in to connect
      </Link>
    </div>
  );
}
function ShareProfile({ ownId }: { ownId: string }) {
  const link = `${window.location.origin}/friends/${encodeURIComponent(ownId)}`;
  const [copied, setCopied] = useState(false),
    [failed, setFailed] = useState(false);
  async function copy() {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setFailed(false);
    } catch {
      setFailed(true);
    }
  }
  return (
    <section className="friend-share" aria-labelledby="share-title">
      <div>
        <h2 id="share-title">Invite friends</h2>
        <p>
          Share your profile link. Your watch list stays private until you
          accept a friend request.
        </p>
      </div>
      <label htmlFor="profile-link">Your profile link</label>
      <div className="friend-share-input">
        <input
          id="profile-link"
          readOnly
          value={link}
          onFocus={(event) => event.target.select()}
        />
        <button
          className="friend-primary"
          type="button"
          onClick={() => void copy()}
        >
          {copied ? <Check size={17} /> : <Copy size={17} />}
          {copied ? "Link copied" : "Copy link"}
        </button>
      </div>
      {failed && (
        <p role="status">Select the link above and copy it manually.</p>
      )}
      {copied && (
        <span className="sr-only" role="status">
          Profile link copied.
        </span>
      )}
    </section>
  );
}
function FriendContent({ ownId, target }: { ownId: string; target?: string }) {
  const { refresh } = useAccount();
  const state = useMemo(() => createFriendState(target), [target]);
  const view = useSyncExternalStore(state.subscribe, state.getSnapshot);
  useEffect(() => state.start(), [state]);
  useEffect(() => {
    if (view.signedOut) void refresh();
  }, [view.signedOut, refresh]);
  useEffect(() => {
    const focus = () =>
      state.visibility(document.visibilityState === "visible");
    const blur = () => state.visibility(false);
    window.addEventListener("focus", focus);
    window.addEventListener("blur", blur);
    document.addEventListener("visibilitychange", focus);
    return () => {
      window.removeEventListener("focus", focus);
      window.removeEventListener("blur", blur);
      document.removeEventListener("visibilitychange", focus);
    };
  }, [state]);
  if (view.signedOut) return <SignIn target={target} />;
  const change = (path: string, message: string) =>
    void state.change(path, message);
  return (
    <>
      {(!target || target === ownId) && <ShareProfile ownId={ownId} />}
      {target && (
        <Link className="text-link" to="/friends">
          All friends
        </Link>
      )}
      <div className="friend-feedback" aria-live="polite">
        {view.message && <p role="status">{view.message}</p>}
        {view.pending && <p role="status">Updating your connection…</p>}
      </div>
      {view.error && (
        <div className="account-error" role="alert">
          <p>{view.error}</p>
          <button
            type="button"
            className="friend-secondary"
            onClick={() => state.refresh()}
          >
            Try again
          </button>
        </div>
      )}
      {view.loading && !view.pending && <p role="status">Loading friends…</p>}
      {view.data?.connections && (
        <>
          <ConnectionGroup
            title="Your friends"
            entries={view.data.connections.accepted}
            empty="No friends connected yet. Share your link to make your first connection."
            change={change}
          />
          <ConnectionGroup
            title="Incoming requests"
            entries={view.data.connections.incoming}
            empty="No incoming requests."
            change={change}
          />
          <ConnectionGroup
            title="Sent requests"
            entries={view.data.connections.outgoing}
            empty="No requests waiting for a reply."
            change={change}
          />
        </>
      )}
      {view.data?.profile && (
        <ProfileCard profile={view.data.profile} change={change} />
      )}
      {view.data?.watchList && (
        <section
          className="friend-watch-list"
          aria-labelledby="friend-list-title"
        >
          <h2 id="friend-list-title">
            {view.data.watchList.profile.displayName}’s watch list
          </h2>
          <p>“Want to watch” adds a film to your own list.</p>
          {!view.data.watchList.films.length ? (
            <div className="empty-state">
              <h3>No films on this list yet.</h3>
            </div>
          ) : (
            <WatchListSections films={view.data.watchList.films} />
          )}
        </section>
      )}
    </>
  );
}
type Change = (path: string, message: string) => void;
function ConnectionGroup({
  title,
  entries,
  empty,
  change,
}: {
  title: string;
  entries: Connection[];
  empty: string;
  change: Change;
}) {
  return (
    <section className="friend-section" aria-label={title}>
      <div className="friend-section-heading">
        <h2>{title}</h2>
        <span>{entries.length}</span>
      </div>
      {entries.length ? (
        <ul className="friend-grid">
          {entries.map((entry) => (
            <li key={entry.id}>
              <article className="friend-card" aria-label={entry.displayName}>
                <div className="friend-avatar" aria-hidden="true">
                  <Users size={23} />
                </div>
                <div className="friend-details">
                  <h3>
                    <Link to={`/friends/${encodeURIComponent(entry.userId)}`}>
                      {entry.displayName}
                    </Link>
                  </h3>
                  <p>
                    {entry.relationship === "accepted"
                      ? "Connected as friends"
                      : entry.relationship === "incoming"
                        ? "Wants to connect with you"
                        : "Waiting for their reply"}
                  </p>
                  <ConnectionActions
                    profile={{
                      id: entry.userId,
                      displayName: entry.displayName,
                      relationshipId: entry.id,
                      relationship: entry.relationship,
                    }}
                    change={change}
                  />
                </div>
              </article>
            </li>
          ))}
        </ul>
      ) : (
        <p className="friend-empty">{empty}</p>
      )}
    </section>
  );
}
function ProfileCard({
  profile,
  change,
}: {
  profile: FriendProfile;
  change: Change;
}) {
  return (
    <section className="friend-profile">
      <div className="friend-avatar" aria-hidden="true">
        <Users size={28} />
      </div>
      <h2>{profile.displayName}</h2>
      <p>
        {
          {
            self: "This is your profile. Share your link to connect with friends.",
            none: "Connect as friends to see each other’s watch lists.",
            incoming:
              "Would you like to connect? Accepting shares your watch lists with each other.",
            outgoing:
              "Your request is waiting for a reply. Their watch list stays private until they accept.",
            accepted: "You’re connected as friends.",
          }[profile.relationship]
        }
      </p>
      {profile.relationship === "self" ? (
        <Link className="text-link" to="/starred">
          Your watch list
        </Link>
      ) : (
        <ConnectionActions profile={profile} change={change} />
      )}
    </section>
  );
}
function ConnectionActions({
  profile,
  change,
}: {
  profile: FriendProfile;
  change: Change;
}) {
  const [confirmRemove, setConfirmRemove] = useState(false);
  function act(action: string, message: string) {
    change(`/relationships/${profile.relationshipId}/${action}`, message);
  }
  return (
    <div className="friend-actions">
      {profile.relationship === "none" && (
        <button
          className="friend-primary"
          type="button"
          onClick={() =>
            change(
              `/requests/${encodeURIComponent(profile.id)}`,
              "Friend request sent.",
            )
          }
        >
          <UserPlus size={17} aria-hidden="true" />
          Send friend request
        </button>
      )}
      {profile.relationship === "incoming" && (
        <>
          <button
            className="friend-primary"
            type="button"
            onClick={() => act("accept", "You’re now connected as friends.")}
          >
            Accept request
          </button>
          <button
            className="friend-secondary"
            type="button"
            onClick={() => act("decline", "Friend request declined.")}
          >
            Decline request
          </button>
        </>
      )}
      {profile.relationship === "outgoing" && (
        <button
          className="friend-secondary"
          type="button"
          onClick={() => act("cancel", "Friend request cancelled.")}
        >
          Cancel request
        </button>
      )}
      {profile.relationship === "accepted" &&
        (confirmRemove ? (
          <div className="friend-confirm">
            <p>
              Disconnect from {profile.displayName}? You’ll both lose access to
              each other’s watch lists.
            </p>
            <button
              className="friend-danger"
              type="button"
              onClick={() => act("remove", "Friend connection removed.")}
            >
              Disconnect
            </button>
            <button
              className="friend-secondary"
              type="button"
              onClick={() => setConfirmRemove(false)}
            >
              Keep connection
            </button>
          </div>
        ) : (
          <button
            className="friend-secondary"
            type="button"
            onClick={() => setConfirmRemove(true)}
          >
            Remove friend
          </button>
        ))}
    </div>
  );
}

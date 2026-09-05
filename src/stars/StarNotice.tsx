import { useStars } from "./context";
export function StarNotice() {
  const { error, retry } = useStars();
  return error ? (
    <div className="star-notice" role="alert">
      <span>{error}</span>
      <button type="button" onClick={retry}>
        Refresh stars
      </button>
    </div>
  ) : null;
}

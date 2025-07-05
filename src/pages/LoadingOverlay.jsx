import LoadingAnimation from "./LoadingAnimation";

export default function LoadingOverlay({ loading }) {
  return (
    <div
      className={`fixed inset-0 z-30 bg-white bg-opacity-90 flex items-center justify-center transition-opacity duration-300 ease-in-out ${
        loading ? "opacity-100" : "opacity-0 pointer-events-none"
      }`}
    >
      <LoadingAnimation />
    </div>
  );
}

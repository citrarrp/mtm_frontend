import CTABacktoHome from "../components/CTAHome";

export default function CustomNotFound() {
  return (
    <main className="grid min-h-screen place-items-center px-6 py-24 sm:py-32 lg:px-8">
      <div className="text-center">
        <p className="text-7xl font-bold text-[#2c64c7] md:text-8xl lg:text-9xl">
          404
        </p>
        <h1 className="mt-4 text-md font-bold leading-none traacking-tight text-gray-900 md:text-3xl lg:text-5xl">
          Page Not Found
        </h1>
        <p className="mt-6 font-normal leading-7 text-gray-500 text-md sm:px-16 lg:px-48 lg:text-xl ">
          Maaf, kami tidak menemukan halaman yang kamu cari.
        </p>
      </div>
      <CTABacktoHome />
    </main>
  );
}

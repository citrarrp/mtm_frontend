import React from "react";
import { Link } from "react-router-dom";

export default function CTABacktoHome() {
  return (
    <Link to="/">
      <p
        className="outline-2 outline-[#2c64c7]/80 text-[#105bdf] font-bold shadow-xl
          px-6 py-3 rounded-md text-xl transition duration-300 hover:bg-[#105bdf] hover:text-white
          max-w-full min-w-60 tracking-widest"
      >
        Go Back To Home
      </p>
    </Link>
  );
}

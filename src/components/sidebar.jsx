import SideBarLink from "./link-sidebar";
import { NavLink } from "react-router-dom";
import { useContext } from "react";
import "../styles/index.css";
import { AuthContext } from "../context/auth";
import { SidebarContext } from "../context/sidebar-context";
import { IoLogOutOutline } from "react-icons/io5";
import {
  MdKeyboardDoubleArrowLeft,
  MdKeyboardDoubleArrowRight,
} from "react-icons/md";
export default function Sidebar() {
  const { isOpen, setIsOpen } = useContext(SidebarContext);
  const { logout } = useContext(AuthContext);

  const handleClick = async (e) => {
    e.preventDefault();
    try {
      await logout();
    } catch (error) {
      alert(error.message);
    }
  };

  return (
    <>
      <aside
        id="sidebar"
        className={`fixed top-0 left-0 z-40 h-screen transition-all duration-300 ${
          isOpen ? "w-60" : "w-16"
        }`}
        aria-label="Sidebar"
      >
        <div className="flex h-full flex-col justify-between overflow-y-auto bg-gray-100 px-3">
          <div className="pb-5">
            <div
              className={`mb-6 flex items-center ${
                isOpen ? "justify-between" : "justify-center"
              } pt-5`}
            >
              {isOpen && (
                <NavLink to="/" className="items-center">
                  <h1 className="text-[#105bdf] text-[19px] font-bold">
                    <b>Delivery Tracking</b>
                  </h1>
                </NavLink>
              )}
              <button
                onClick={() => setIsOpen(!isOpen)}
                type="button"
                className="text-gray-800 cursor-pointer"
              >
                {isOpen ? (
                  <MdKeyboardDoubleArrowLeft size={19} />
                ) : (
                  <MdKeyboardDoubleArrowRight size={19} />
                )}
              </button>
            </div>
            <ul>
              <SideBarLink isOpen={isOpen} />
            </ul>
          </div>

          <div className="mt-auto mb-5 text-center">
            <button
              onClick={handleClick}
              className={`cursor-pointer text-sm rounded flex text-[#2c64c7] items-center justify-center border-1 border-[#2c64c7] hover:bg-[#2c64c7] hover:text-white ${
                isOpen ? " px-3 py-1 w-fit mx-auto gap-2" : " p-2"
              }`}
            >
              <IoLogOutOutline size={18} />
              {isOpen && <span>Logout</span>}
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}

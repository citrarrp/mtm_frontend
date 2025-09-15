import {
  MdLabel,
  MdDriveFileMove,
  MdDriveFileMoveOutline,
  MdLabelOutline,
  MdQrCodeScanner,
  MdOutlineQrCodeScanner,
} from "react-icons/md";
import {
  HiOutlineHome,
  HiOutlinePrinter,
  HiHome,
  HiPrinter,
  HiOutlineTruck,
  HiTruck,
} from "react-icons/hi";
import {
  PiShippingContainerLight,
  PiShippingContainerFill,
  PiTruckTrailerFill,
  PiTruckTrailer,
} from "react-icons/pi";
import { PiPassword, PiPasswordFill } from "react-icons/pi";
import { AiFillProduct, AiOutlineProduct } from "react-icons/ai";
import { RiChatHistoryFill, RiChatHistoryLine } from "react-icons/ri";
import { TiUserAdd, TiUserAddOutline } from "react-icons/ti";
import { FaAddressCard, FaRegAddressCard } from "react-icons/fa";
import { NavLink } from "react-router-dom";
import { useLocation } from "react-router-dom";
import { useContext } from "react";
import { SidebarContext } from "../context/sidebar-context.js";
import { AuthContext } from "../context/auth.js";
import { FaClipboardCheck, FaRegClipboard } from "react-icons/fa6";

const usePathname = () => {
  const location = useLocation();
  return location.pathname;
};
const Sidebar_Link = [
  {
    id: 1,
    routes: "/",
    name: "Home",
    icon: {
      fill: <HiHome size={22} />,
      outline: <HiOutlineHome size={22} />,
    },
    role: "ppic",
  },
  {
    id: 2,
    routes: "/history",
    name: "Truck Timetable",
    icon: {
      fill: <RiChatHistoryFill size={22} />,
      outline: <RiChatHistoryLine size={22} />,
    },
    role: "ppic",
  },
  {
    id: 3,
    routes: "/label",
    name: "Data Label",
    icon: {
      fill: <MdLabel size={22} />,
      outline: <MdLabelOutline size={22} />,
    },
    role: "ppic",
  },
  {
    id: 4,
    routes: "/updateDelivery",
    name: "Update Order",
    icon: {
      fill: <MdDriveFileMove size={22} />,
      outline: <MdDriveFileMoveOutline size={22} />,
    },
    role: "ppic",
  },
  {
    id: 5,
    routes: "/printLabel",
    name: "Print Label",
    icon: {
      fill: <HiPrinter size={22} />,
      outline: <HiOutlinePrinter size={22} />,
    },
    role: "production",
  },
  {
    id: 6,
    routes: "/scanQR",
    name: "Scan QR Code",
    icon: {
      fill: <MdQrCodeScanner size={22} />,
      outline: <MdOutlineQrCodeScanner size={22} />,
    },
    role: "ppic",
  },
  {
    id: 7,
    routes: "/tracking",
    name: "Tracking Delivery",
    icon: {
      fill: <HiTruck size={22} />,
      outline: <HiOutlineTruck size={22} />,
    },
    role: "ppic",
  },
  {
    id: 8,
    routes: "/absensi",
    name: "Absensi Truck",
    icon: {
      fill: <FaAddressCard size={22} />,
      outline: <FaRegAddressCard size={22} />,
    },
    role: "ppic",
  },
  {
    id: 9,
    routes: "/scanFinishPrepare",
    name: "Scan Finish Prepare",
    icon: {
      fill: <PiShippingContainerFill size={22} />,
      outline: <PiShippingContainerLight size={22} />,
    },
    role: "ppic",
  },
  {
    id: 10,
    routes: "/readyToshipping",
    name: "Scan Ready To Shipping",
    icon: {
      fill: <FaClipboardCheck size={22} />,
      outline: <FaRegClipboard size={22} />,
    },
    role: "ppic",
  },
  {
    id: 11,
    routes: "/masterMaterial",
    name: "Data Master Material",
    icon: {
      fill: <AiFillProduct size={22} />,
      outline: <AiOutlineProduct size={22} />,
    },
    role: "ppic",
  },
  {
    id: 12,
    routes: "/masterTruck",
    name: "Data Master Truck",
    icon: {
      fill: <PiTruckTrailerFill size={22} />,
      outline: <PiTruckTrailer size={22} />,
    },
    role: "ppic",
  },
  {
    id: 13,
    routes: "/register",
    name: "Registrasi User",
    icon: {
      fill: <TiUserAdd size={22} />,
      outline: <TiUserAddOutline size={22} />,
    },
    role: "admin",
  },
  {
    id: 14,
    routes: "/forget-password",
    name: "Ubah Password",
    icon: {
      fill: <PiPasswordFill size={22} />,
      outline: <PiPassword size={22} />,
    },
    role: "",
  },
];

export default function SideBarLink() {
  const pathname = usePathname();
  const { user } = useContext(AuthContext);
  const { isOpen } = useContext(SidebarContext);

  const handleSideBarClick = () => {
    if (
      localStorage.getItem("alertMessage") &&
      localStorage.getItem("isSuccess")
    ) {
      localStorage.clear();
    }
  };

  return Sidebar_Link.filter(
    (item) =>
      String(user.dept.split("-")[0]).toLowerCase().includes(item.role) ||
      String(user.position.split("-")[0]).toLowerCase().includes(item.role)
  ).map((link) => {
    const isCurrentMenu =
      link.id !== 1 ? pathname.includes(link.routes) : pathname === "/";
    return (
      <>
        <li key={link.id}>
          <NavLink
            to={`${link.routes}`}
            className={({ isActive }) =>
              `flex items-center rounded-lg p-[6px] ${
                isOpen ? "" : "justify-center"
              } transition-colors duration-200 ${
                isActive || isCurrentMenu
                  ? "bg-[#2c64c7] text-white"
                  : "text-gray-900 hover:bg-gray-100 hover:text-[#2c64c7]"
              }`
            }
            onClick={handleSideBarClick}
          >
            {({ isActive }) => (
              <>
                {isActive || isCurrentMenu ? link.icon.fill : link.icon.outline}
                {isOpen && <span className="ml-5 text-sm">{link.name}</span>}
              </>
            )}
          </NavLink>
        </li>
      </>
    );
  });
}

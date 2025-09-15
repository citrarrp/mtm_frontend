import QRCode from "react-qr-code";
import logo from "../assets/logomtmfix.png";
import Barcode from "react-barcode";
import moment from "moment-timezone";
import {
  MdOutlineCircle,
  MdStarOutline,
  MdOutlineSquare,
} from "react-icons/md";
import {
  MdOutlinePentagon,
  MdOutlineHexagon,
  MdOutlineRectangle,
} from "react-icons/md";
import {
  RiTriangleLine,
  RiPokerDiamondsLine,
  RiPokerHeartsLine,
} from "react-icons/ri";
import { PiStarAndCrescentLight } from "react-icons/pi";
import { PiParallelogramBold } from "react-icons/pi";
import { BsLightningCharge } from "react-icons/bs";
import { BiCircleHalf } from "react-icons/bi";
import { SiBastyon } from "react-icons/si";
import { GrFastForward } from "react-icons/gr";
import { MdLabelImportantOutline } from "react-icons/md";
import { TiMinusOutline } from "react-icons/ti";
import { TiStarburstOutline } from "react-icons/ti";
import { MdFormatOverline } from "react-icons/md";
import { TiPlusOutline } from "react-icons/ti";
import { TiWavesOutline } from "react-icons/ti";
import { TiThLargeOutline } from "react-icons/ti";
import { GiZigzagHieroglyph } from "react-icons/gi";
import { IoMdCloudOutline } from "react-icons/io";
import { FaRegBookmark } from "react-icons/fa";
import { RiMapLine } from "react-icons/ri";
import { CiLocationArrow1 } from "react-icons/ci";
import { SiNextbilliondotai } from "react-icons/si";
import { LuFishSymbol } from "react-icons/lu";
import { VscSymbolNumeric } from "react-icons/vsc";
import { TbArrowBadgeDown } from "react-icons/tb";

const TagMTM = ({
  tagData,
  dataCust,
  dataPart,
  code,
  line,
  date,
  shift,
  user,
  customer,
  idx,
}) => {
  console.log(dataCust, "DATA TAG", dataPart, tagData);
  if (!dataPart || dataPart.length === 0) return <p>Data tidak tersedia</p>;

  const InfoGrid = () => (
    <>
      <div className="flex-1 space-y-1 text-[17.5px] leading-normal font-bold">
        {[
          ["PART NAME", dataPart[0].material_description || ""],
          ["PART NO", dataPart[0].material || ""],
        ].map(([label, value], idx) => (
          <div className="grid grid-cols-12 gap-2" key={idx}>
            <span className="col-span-4 font-bold">{label}</span>
            <span className="col-span-8">: {value}</span>
          </div>
        ))}
      </div>
      <div className="flex-1 space-y-1 text-[17.5px] leading-normal mt-1 font-bold">
        {[
          ["CUST. NO", dataPart[0].customer_material || ""],
          ["CUSTOMER", customer],
          ["LINE", line],
        ].map(([label, value], idx) => (
          <div className="grid grid-cols-12 gap-2" key={idx}>
            <span className="col-span-4 font-bold">{label}</span>
            <span className="col-span-8">: {value}</span>
          </div>
        ))}
      </div>
    </>
  );

  // Baiknya kedepannya unggah foto icon sendiri?? karena jika susunan line berubah, berubah juga iconnya
  const shapeIcons = [
    MdOutlineCircle,
    MdStarOutline,
    MdOutlineSquare,
    MdOutlinePentagon,
    MdOutlineHexagon,
    MdOutlineRectangle,
    RiTriangleLine,
    RiPokerDiamondsLine,
    PiStarAndCrescentLight,
    PiParallelogramBold,
    BsLightningCharge,
    RiPokerHeartsLine,
    BiCircleHalf,
    SiBastyon,
    GrFastForward,
    MdLabelImportantOutline,
    TiMinusOutline,
    TiStarburstOutline,
    MdFormatOverline,
    TiPlusOutline,
    TiThLargeOutline,
    TiWavesOutline,
    GiZigzagHieroglyph,
    IoMdCloudOutline,
    FaRegBookmark,
    RiMapLine,
    CiLocationArrow1,
    SiNextbilliondotai,
    LuFishSymbol,
    VscSymbolNumeric,
    TbArrowBadgeDown,
  ];

  const Footer = () => (
    <div className="absolute bottom-4 left-2 right-1 text-[18px] -space-y-2 font-bold">
      <div className="flex items-center">
        <span
          className={`font-bold ${
            dataCust[0]?.kanban === false ? "ml-[110px]" : "ml-[12px]"
          }`}
        >
          OPERATOR
        </span>
        <span
          className={`${
            dataCust[0]?.kanban === false ? "ml-[17px]" : "ml-[28px]"
          }`}
        >
          : {user.npk} {user.fullname.toUpperCase().slice(0, 10)}
        </span>
      </div>
      <div className="flex mx-3 pt-5 -space-y-3">
        <div className="border-2 border-[#1e2939] p-1.5 flex-1">
          <div className="flex justify-between">
            <span>SHIFT : {shift || 1}</span>
            <span>{moment.tz(date, "Asia/Jakarta").format("DD.MM.YYYY")}</span>
            <span>{moment.tz("Asia/Jakarta").format("HH:mm")} WIB</span>
          </div>
        </div>
      </div>
    </div>
  );
  const IconComponent = shapeIcons[idx];

  const customSize = [13, 14, 20, 24, 27, 29].includes(idx) ? 40 : 48;
  const Layout1 = () => (
    <div className="w-[560px] h-[350px] mr-20 p-2 border-2 border-[#1e2939] text-[10pt] font-sans bg-[#ffffff] relative leading-normal">
      <div className="flex justify-between items-center border-b border-[#1e2939] pb-1 mb-2">
        <div className="w-[150px] h-[16px] flex items-center justify-center">
          <img src={logo} alt="PT Menara Terus Makmur" className="h-[40px]" />
        </div>
        <div className="flex-1 flex flex-col items-center justify-center text-center px-2">
          <div className="text-[18px] font-bold mr-10">IDENTIFIKASI BARANG</div>
          <div className="text-[10px] font-bold mr-10">
            NO FORM : PR4-FRM-05064
          </div>
        </div>
        <IconComponent size={customSize} />
      </div>

      <div className="flex justify-between gap-2 mb-2">
        <div className="flex flex-col items-center flex-shrink-0 gap-1">
          <QRCode
            value={
              dataPart[0]?.job_no
                ? `${dataPart[0]?.job_no}|${code}|${
                    dataPart[0]?.qtyKanban || dataCust[0]?.qty || 0
                  }|${moment(date).format("DDMMYYYY")}|${shift}|${String(
                    (tagData[0]?.qty ?? 0) + 1
                  ).padStart(4, "0")}|${dataPart[0]?.customer_material}`
                : `${code}|${
                    dataPart[0]?.qtyKanban || dataCust[0]?.qty || 0
                  }|${moment(date).format("DDMMYYYY")}|${shift}|${String(
                    (tagData[0]?.qty ?? 0) + 1
                  ).padStart(4, "0")}|${dataPart[0]?.customer_material}`
            }
            size={95}
            level="H"
            bgColor="transparent"
          />
        </div>
        <div className="flex-1 mx-2">
          <InfoGrid />
        </div>
        <div className="flex flex-col items-center flex-shrink-0 gap-1">
          <QRCode
            value={`${dataPart[0]?.customer_material}`}
            size={95}
            level="H"
            bgColor="transparent"
          />
          <div className="font-bold text-center items-center mt-1 flex flex-row justify-between gap-1">
            <div className="text-[18px]">QTY :</div>
            <div className="text-[30px]">
              {dataPart[0]?.qtyKanban || dataCust[0]?.qty || 0}
            </div>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );

  const Layout2 = () => (
    <div className="w-[560px] h-[350px] p-2 mr-20 border-2 border-[#1e2939] text-[10pt] font-sans bg-[#ffffff] relative leading-normal">
      <div className="flex justify-between items-center border-b-2 border-[#1e2939] pb-1 mb-2">
        <div className="w-[180px] h-[16px] flex items-center justify-center">
          <img src={logo} alt="PT Menara Terus Makmur" className="h-[40px] " />
        </div>

        <div className="flex-1 flex flex-col items-center justify-center text-center px-2">
          <div className="text-[18px] font-bold mr-10">IDENTIFIKASI BARANG</div>
          <div className="text-[10px] font-bold mr-10">
            NO FORM : PR-FR-05-64
          </div>
        </div>
        <IconComponent size={customSize} />
      </div>

      <div className="flex justify-between gap-2 mb-2 ">
        <div className="flex-1 mx-3">
          <InfoGrid />
        </div>
        <div className="flex flex-col items-center flex-shrink-0 gap-1 mr-1">
          <QRCode
            value={
              dataCust[0]?.selectedData
                ? `${dataCust[0]?.selectedData}|${code}|${moment(date).format(
                    "DDMMYYYY"
                  )}|${shift}|${String((tagData[0]?.qty ?? 0) + 1).padStart(
                    4,
                    "0"
                  )}|${dataPart[0].customer_material}|${
                    dataPart[0]?.qtyKanban || dataCust[0]?.qty || 0
                  }`
                : `${code}|${moment(date).format("DDMMYYYY")}|${shift}|${String(
                    (tagData[0]?.qty ?? 0) + 1
                  ).padStart(4, "0")}|${dataPart[0].customer_material}|${
                    dataPart[0]?.qtyKanban || dataCust[0]?.qty || 0
                  }`
            }
            size={150}
            level="H"
            bgColor="transparent"
          />
          <div className="font-bold text-center items-center mt-1 flex flex-row justify-between gap-1">
            <div className="text-[18px]">QTY :</div>
            <div className="text-[30px]">
              {" "}
              {dataPart[0]?.qtyKanban || dataCust[0]?.qty || 0}
            </div>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );

  return dataCust[0]?.kanban === false ? <Layout1 /> : <Layout2 />;
};

export default TagMTM;

import { useState } from "react";
import LabelContext from "../context/label";

export const LabelProvider = ({ children }) => {
  const [dataLabel, setDataLabel] = useState([]);

  const updateData = (newDataLabel) => {
    setDataLabel(newDataLabel);
  };

  const contextValue = {
    dataLabel,
    updateData,
  };

  return (
    <LabelContext.Provider value={contextValue}>
      {children}
    </LabelContext.Provider>
  );
};

export default LabelProvider;

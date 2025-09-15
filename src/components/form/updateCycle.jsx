import React from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { FaDeleteLeft } from "react-icons/fa6";
import { MdAdd } from "react-icons/md";
import { GrUpdate } from "react-icons/gr";

const defaultSteps = [
  "Received Order",
  "Start Preparation (Pulling)",
  "Waiting Post",
  "Finish Preparation",
  "Ready to Shipping Area",
  "Create Surat Jalan",
  "Arrived Truck",
  "Departure Truck",
];

const TimeInput = ({ value, onChange, className }) => {
  const formatTime = (timeString) => {
    if (!timeString) return { hours: "", minutes: "" };
    const [hours, minutes] = timeString.split(":");
    return { hours, minutes };
  };

  const [time, setTime] = React.useState(formatTime(value));
  const hoursRef = React.useRef(null);
  const minutesRef = React.useRef(null);

  const handleChange = (e) => {
    const { name, value } = e.target;
    let newValue = value;

    if (name === "hours" && value.length === 2) {
      minutesRef.current.focus();
    }

    if (name === "hours" && value > 23) {
      newValue = "23";
    }
    if (name === "minutes" && value > 59) {
      newValue = "59";
    }

    const newTime = { ...time, [name]: newValue };
    setTime(newTime);

    if (newTime.hours && newTime.minutes) {
      onChange(
        `${newTime.hours.padStart(2, "0")}:${newTime.minutes.padStart(2, "0")}`
      );
    } else {
      onChange("");
    }
  };

  const handleKeyDown = (e, fieldName) => {
    // Pindahin fokus
    if (e.key === "ArrowRight" && fieldName === "hours") {
      minutesRef.current.focus();
    }
    if (e.key === "ArrowLeft" && fieldName === "minutes") {
      hoursRef.current.focus();
    }
    if (e.key === "Backspace" && fieldName === "minutes" && !time.minutes) {
      hoursRef.current.focus();
    }
  };

  return (
    <div
      className={`flex items-center space-x-0 bg-white border rounded-md px-2 py-1 ${className}`}
      style={{ width: "100px" }}
    >
      <input
        ref={hoursRef}
        type="number"
        name="hours"
        min="0"
        max="23"
        value={time.hours}
        onChange={handleChange}
        onKeyDown={(e) => handleKeyDown(e, "hours")}
        placeholder="00"
        className="w-8 text-center border-none focus:ring-0 p-0 text-sm appearance-none [-moz-appearance:_textfield] [&::-webkit-outer-spin-button]:m-0 [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:m-0 [&::-webkit-inner-spin-button]:appearance-none"
      />
      <span className="text-gray-400">:</span>
      <input
        ref={minutesRef}
        type="number"
        name="minutes"
        min="0"
        max="59"
        value={time.minutes}
        onChange={handleChange}
        onKeyDown={(e) => handleKeyDown(e, "minutes")}
        placeholder="00"
        className="w-8 text-center border-none focus:ring-0 p-0 text-sm appearance-none [-moz-appearance:_textfield] [&::-webkit-outer-spin-button]:m-0 [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:m-0 [&::-webkit-inner-spin-button]:appearance-none"
      />
    </div>
  );
};

export default function CycleUpdateForm({ onSubmit }) {
  const {
    register,
    control,
    handleSubmit,
    formState: { errors },
    setValue,
    getValues,
  } = useForm({
    defaultValues: {
      cycles: [
        {
          numberCycle: 1,
          stepCycle: defaultSteps.map((step) => ({
            nama: step,
            waktu_standar: "",
          })),
        },
      ],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: "cycles",
  });

  const checkNumberCycleUnique = (data) => {
    const numbers = data.cycles.map((c) => c.numberCycle);
    const hasDuplicates = new Set(numbers).size !== numbers.length;
    return !hasDuplicates;
  };

  const handleFormSubmit = (data) => {
    if (!checkNumberCycleUnique(data)) {
      alert("Nomor Cyle harus unik!");
      return;
    }
    onSubmit(data.cycles);
  };

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-6">
      {fields.map((cycle, index) => (
        <div
          key={cycle.id}
          className="border p-4 rounded-xl shadow-md bg-white"
        >
          <div className="mb-4">
            <label className="block font-bold text-gray-700 mb-2">
              Number Cycle
            </label>
            <input
              type="number"
              min="1"
              {...register(`cycles.${index}.numberCycle`, {
                required: true,
                min: {
                  value: 1,
                  message: "Nomor cycle harus lebih besar sama dengan 1",
                },
              })}
              className={`border px-3 py-2 rounded w-40 ${
                errors.cycles?.[index]?.numberCycle
                  ? "border-red-500"
                  : "border-gray-300"
              }`}
            />
            {errors.cycles?.[index]?.numberCycle && (
              <p className="text-red-500 text-sm mt-1">
                {errors.cycles[index].numberCycle.message}
              </p>
            )}
          </div>

          <table className="table-auto min-w-full mb-2 divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Nama Proses
                </th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Waktu Standar
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {defaultSteps.map((stepName, stepIndex) => (
                <tr key={stepIndex} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm font-medium text-gray-900">
                    {stepName}
                  </td>
                  <td className="px-4 py-3">
                    <TimeInput
                      value={getValues(
                        `cycles.${index}.stepCycle.${stepIndex}.waktu_standar`
                      )}
                      onChange={(value) =>
                        setValue(
                          `cycles.${index}.stepCycle.${stepIndex}.waktu_standar`,
                          value
                        )
                      }
                      className="border-gray-300 focus-within:border-blue-500 focus-within:ring-1 focus-within:ring-blue-500"
                    />
                    {/* <input
                      type="time"
                      step="60"
                      {...register(
                        `cycles.${index}.stepCycle.${stepIndex}.waktu_standar`
                      )}
                      className="border px-2 py-1 rounded w-40"
                    /> */}
                    <input
                      type="hidden"
                      value={stepName}
                      {...register(
                        `cycles.${index}.stepCycle.${stepIndex}.nama`
                      )}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="mt-4 text-right">
            <button
              type="button"
              onClick={() => remove(index)}
              className="text-[#f33d3a] hover:text-red-800 font-medium flex items-center gap-1"
            >
              <FaDeleteLeft className="align-middle mr-2 items-center" />
              Hapus Cycle Ini
            </button>
          </div>
        </div>
      ))}

      <div className="flex gap-4">
        <button
          type="button"
          onClick={() => {
            const currentCycles = getValues("cycles");
            const maxNumber =
              currentCycles.length > 0
                ? Math.max(...currentCycles.map((c) => c.numberCycle))
                : 0;
            append({
              numberCycle: maxNumber + 1,
              stepCycle: defaultSteps.map((step) => ({
                nama: step,
                waktu_standar: "",
              })),
            });
          }}
          className="bg-[#105bdf] hover:bg-[#2c64c7] text-white px-4 py-2 cursor-pointer rounded-md shadow-sm flex items-center gap-2"
        >
          <MdAdd />
          Tambah Cycle Baru
        </button>

        <button
          type="submit"
          className="bg-[#27b387] hover:bg-green-700 text-white px-4 py-2 rounded-md cursor-pointer shadow-sm flex items-center gap-2"
        >
          <GrUpdate />
          Update Cycle
        </button>
      </div>
    </form>
  );
}

import React from "react";
import birthdayData from "../data/birthdayAnniversary.json";
import { monthOptions } from "../constants";

// Format date to "1st Jan"
const formatDate = (dateStr) => {
  const date = new Date(dateStr);
  const day = date.getDate();
  const month = date.toLocaleString("default", { month: "short" });
  const suffix =
    day > 3 && day < 21 ? "th" : ["st", "nd", "rd"][(day % 10) - 1] || "th";
  return `${day}${suffix} ${month}`;
};

const toTitleCase = (str) =>
  str
    .toLowerCase()
    .split(" ")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");

export default function BirthdayAnniversaryTable({
  selectedMonth,
  bgColor,
  textColor,
  activeYear, // 👈 now accepted as a prop
}) {
  const monthIndex = monthOptions.indexOf(selectedMonth);

  const filterByMonthAndYear = (items) =>
    items.filter((entry) => {
      const date = new Date(entry.date);
      return date.getMonth() === monthIndex;
    });

  const birthdays = filterByMonthAndYear(birthdayData.birthdays);
  const anniversaries = filterByMonthAndYear(birthdayData.anniversaries);

  if (birthdays.length === 0 && anniversaries.length === 0) return null;

  const Table = ({ title, icon, data }) => (
    <div className="w-full sm:w-1/2">
      <h3 className="text-md font-semibold text-[#640D6B] mb-2 flex items-center gap-2">
        {icon} {title}
      </h3>
      <table className="w-full text-sm border border-gray-200">
        <thead
          style={{ backgroundColor: bgColor, color: textColor }}
          className="text-center"
        >
          <tr>
            <th className="p-2 border">Name</th>
            <th className="p-2 border">Date</th>
          </tr>
        </thead>
        <tbody>
          {data.map((entry, idx) => (
            <tr key={idx} className="even:bg-gray-50">
              <td className="p-2 border border-slate-300">{toTitleCase(entry.name)}</td>
              <td className="p-2 border border-slate-300 text-center">
                {formatDate(entry.date)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  return (
    <div className="mt-6 flex flex-col sm:flex-row gap-6">
      {birthdays.length > 0 && (
        <Table title="Birthdays" icon="🎂" data={birthdays} />
      )}
      {anniversaries.length > 0 && (
        <Table title="Anniversaries" icon="💍" data={anniversaries} />
      )}
    </div>
  );
}

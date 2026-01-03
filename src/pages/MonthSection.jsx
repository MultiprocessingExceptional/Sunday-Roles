import React, { useEffect, useState, useRef, useCallback } from "react";
import { Select } from "@geist-ui/react";
import { monthOptions, headings } from "../constants";
import { TrashIcon, MergeIcon, UnmergeIcon } from "./Icons";
import BirthdayAnniversaryTable from "./BirthdayAnniversaryTable";
import rolesList from "../data/rolesList.json";

const getSundaysInMonth = (monthIndex, year) => {
  const sundays = [];
  const date = new Date(year, monthIndex, 1);

  while (date.getMonth() === monthIndex) {
    if (date.getDay() === 0) {
      sundays.push(
        new Date(date.getFullYear(), date.getMonth(), date.getDate())
      );
    }
    date.setDate(date.getDate() + 1);
  }

  return sundays;
};

function formatDateToYYYYMMDD(date) {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

const formatDateToDDMMYYYY = (date) => {
  const dd = String(date.getDate()).padStart(2, "0");
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const yyyy = date.getFullYear();
  return `${dd}-${mm}-${yyyy}`;
};

const allNames = Array.from(
  new Set(
    Object.values(rolesList)
      .flatMap((val) =>
        Array.isArray(val) ? val : [...(val.kids || []), ...(val.adults || [])]
      )
      .map((entry) => entry.name.trim().toLowerCase())
  )
).map((name) =>
  name
    .split(" ")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ")
);

export default function MonthSection({
  monthIndex,
  bgColor,
  textColor,
  registerData,
  initialData,
  activeYear,
  scripturePortions,
}) {
  const [selectedMonth, setSelectedMonth] = useState(
    initialData?.selectedMonth || monthOptions[monthIndex]
  );
  const [sundays, setSundays] = useState([]);
  const [duplicateFields, setDuplicateFields] = useState({});
  const [suggestions, setSuggestions] = useState({});
  const [activeSuggestionIndex, setActiveSuggestionIndex] = useState({});
  const [isInitialized, setIsInitialized] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const hasInitializedRef = useRef(false);
  const containerRef = useRef(null);
  const [savedDataByMonth, setSavedDataByMonth] = useState({});
  const inputRefs = useRef({});

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target)
      ) {
        setSuggestions({});
        setActiveSuggestionIndex({});
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const normalizeArrayFields = (fields) => {
    const updatedFields = { ...fields };

    // Normalize Scripture Reading
    if (!Array.isArray(updatedFields["Scripture Reading"])) {
      const val = updatedFields["Scripture Reading"];
      if (val === undefined || val === "") {
        updatedFields["Scripture Reading"] = ["", ""];
      } else {
        updatedFields["Scripture Reading"] = [val, ""];
      }
    } else if (updatedFields["Scripture Reading"].length < 2) {
      while (updatedFields["Scripture Reading"].length < 2) {
        updatedFields["Scripture Reading"].push("");
      }
    }

    // Normalize Scripture Passage
    if (!Array.isArray(updatedFields["Scripture Passage"])) {
      const val = updatedFields["Scripture Passage"];
      if (val === undefined || val === "") {
        updatedFields["Scripture Passage"] = ["", ""];
      } else {
        updatedFields["Scripture Passage"] = [val, ""];
      }
    } else if (updatedFields["Scripture Passage"].length < 2) {
      while (updatedFields["Scripture Passage"].length < 2) {
        updatedFields["Scripture Passage"].push("");
      }
    }

    // Normalize MV
    if (!Array.isArray(updatedFields["MV"])) {
      const val = updatedFields["MV"];
      if (val === undefined || val === "") {
        updatedFields["MV"] = ["", ""];
      } else {
        updatedFields["MV"] = [val, ""];
      }
    } else if (updatedFields["MV"].length < 2) {
      while (updatedFields["MV"].length < 2) {
        updatedFields["MV"].push("");
      }
    }

    return updatedFields;
  };

  // Auto-fill scripture portions, MV, and message theme based on date
  const autoFillScriptureData = useCallback(
    (sunday) => {
      const date = new Date(sunday.fields.Date);
      const dateStr = formatDateToDDMMYYYY(date);

      console.log(
        `🔍 Looking for scripture data for date: ${dateStr}, year: ${activeYear}`
      );

      // Get scripture data from the scripturePortions JSON
      const scriptureData = scripturePortions?.scripturePortions?.[
        activeYear
      ]?.find((item) => item.date === dateStr);

      if (scriptureData) {
        console.log(`✅ Found scripture data:`, scriptureData);
        const updatedFields = { ...sunday.fields };

        // Fill Scripture Passage as array
        if (scriptureData.scriptures.length >= 2) {
          updatedFields["Scripture Passage"] = [
            scriptureData.scriptures[0].passage,
            scriptureData.scriptures[1].passage,
          ];
          updatedFields["MV"] = [
            scriptureData.scriptures[0].mv,
            scriptureData.scriptures[1].mv,
          ];
        } else if (scriptureData.scriptures.length === 1) {
          updatedFields["Scripture Passage"] = [
            scriptureData.scriptures[0].passage,
            "",
          ];
          updatedFields["MV"] = [scriptureData.scriptures[0].mv, ""];
        } else {
          updatedFields["Scripture Passage"] = ["", ""];
          updatedFields["MV"] = ["", ""];
        }

        // Fill Message Theme
        const messageThemeObj = scriptureData.scriptures.find(
          (s) => s.messageTheme
        );
        if (messageThemeObj) {
          updatedFields["Message Theme"] = messageThemeObj.messageTheme;
        }

        // Keep Message field empty for manual entry
        if (!updatedFields["Message"]) {
          updatedFields["Message"] = "";
        }

        return { ...sunday, fields: updatedFields };
      } else {
        console.log(`⚠️ No scripture data found for ${dateStr}`);
      }

      return sunday;
    },
    [activeYear, scripturePortions]
  );

  const generateSundaysWithScriptureData = useCallback(
    (monthIndex, year) => {
      console.log(
        `📅 Generating Sundays for month ${monthIndex + 1}, year ${year}`
      );
      const generatedSundays = getSundaysInMonth(monthIndex, year).map(
        (date) => {
          console.log(`  - Sunday date: ${formatDateToYYYYMMDD(date)}`);
          return {
            id: date.getTime() + Math.random(),
            fields: normalizeArrayFields({
              Date: formatDateToYYYYMMDD(date),
            }),
            originalFields: {},
            isMerged: false,
          };
        }
      );

      // Auto-fill scripture data for each Sunday
      return generatedSundays.map((sunday) => autoFillScriptureData(sunday));
    },
    [autoFillScriptureData]
  );

  useEffect(() => {
    if (hasInitializedRef.current) return;

    console.log(
      `🎬 Initializing MonthSection for month ${monthIndex}, year ${activeYear}`
    );

    if (initialData && initialData.sundays && initialData.sundays.length > 0) {
      console.log(
        `📦 Using initial data with ${initialData.sundays.length} sundays`
      );
      // Auto-fill scripture data for existing sundays
      const normalized = initialData.sundays.map((sunday) => {
        const normalizedSunday = {
          ...sunday,
          fields: normalizeArrayFields(sunday.fields),
        };
        return autoFillScriptureData(normalizedSunday);
      });

      setSelectedMonth(initialData.selectedMonth);
      setSundays(normalized);
    } else {
      console.log(`🆕 Generating fresh data for month ${monthIndex}`);
      const generated = generateSundaysWithScriptureData(
        monthIndex,
        activeYear
      );
      setSundays(generated);
    }

    setIsInitialized(true);
    hasInitializedRef.current = true;
  }, [
    initialData?.selectedMonth,
    initialData?.sundays?.length,
    monthIndex,
    activeYear,
    autoFillScriptureData,
    generateSundaysWithScriptureData,
  ]);

  const handleMonthChange = useCallback(
    (newMonth) => {
      console.log(`🔄 Changing month from ${selectedMonth} to ${newMonth}`);
      setIsTransitioning(true);

      // Save current data before switching
      setSavedDataByMonth((prev) => ({
        ...prev,
        [selectedMonth]: sundays,
      }));

      const currentMonthIndex = monthOptions.indexOf(newMonth);
      const newSundays = getSundaysInMonth(currentMonthIndex, activeYear);

      console.log(`📆 New month has ${newSundays.length} Sundays`);

      // Check if we have saved data for the new month
      const savedData = savedDataByMonth[newMonth];

      let generated;
      if (savedData && savedData.length > 0) {
        console.log(`💾 Using saved data for ${newMonth}`);
        // Use saved data, but ensure dates match the new month's Sundays and re-apply scripture data
        generated = newSundays.map((date, index) => {
          const savedSunday = savedData[index];
          if (savedSunday) {
            const updatedSunday = {
              ...savedSunday,
              fields: {
                ...normalizeArrayFields(savedSunday.fields),
                Date: formatDateToYYYYMMDD(date), // Update date to match new month
              },
            };
            // Re-apply scripture data for the new date
            return autoFillScriptureData(updatedSunday);
          } else {
            // If we don't have saved data for this Sunday, create new with scripture data
            const newSunday = {
              id: date.getTime() + Math.random(),
              fields: normalizeArrayFields({
                Date: formatDateToYYYYMMDD(date),
              }),
              originalFields: {},
              isMerged: false,
            };
            return autoFillScriptureData(newSunday);
          }
        });
      } else {
        console.log(`🆕 Creating fresh data for ${newMonth}`);
        // No saved data, create fresh with scripture data
        generated = generateSundaysWithScriptureData(
          currentMonthIndex,
          activeYear
        );
      }

      // Update state immediately to ensure proper re-render
      setSundays(generated);
      setSelectedMonth(newMonth);

      // Small delay to show transition
      setTimeout(() => {
        setIsTransitioning(false);
      }, 300);
    },
    [
      activeYear,
      selectedMonth,
      sundays,
      savedDataByMonth,
      autoFillScriptureData,
      generateSundaysWithScriptureData,
    ]
  );

  const registerDataCallback = useCallback(() => {
    if (isInitialized) {
      registerData(monthIndex, { sundays, selectedMonth });
    }
  }, [monthIndex, sundays, selectedMonth, isInitialized, registerData]);

  useEffect(() => {
    registerDataCallback();
  }, [registerDataCallback]);

  const handleInputChange = (index, field, value, subIndex = null) => {
    const updated = [...sundays];
    if (Array.isArray(updated[index].fields[field]) && subIndex !== null) {
      updated[index].fields[field][subIndex] = value;
    } else {
      updated[index].fields[field] = value;
    }
    updated[index].originalFields[field] = updated[index].fields[field];
    setSundays(updated);

    const key =
      subIndex !== null ? `${index}_${field}_${subIndex}` : `${index}_${field}`;

    if (field !== "Date") {
      const match = allNames.filter((n) =>
        n.toLowerCase().includes(value.toLowerCase())
      );
      setSuggestions((prev) => ({
        ...prev,
        [key]: match.slice(0, 5),
      }));

      // Reset active suggestion index when suggestions change
      setActiveSuggestionIndex((prev) => ({
        ...prev,
        [key]: 0, // Start with first suggestion selected
      }));
    }

    if (Object.keys(duplicateFields).length > 0) {
      const dups = computeDuplicates(updated);
      setDuplicateFields(dups);
    }
  };

  const handleSuggestionClick = (index, field, name, subIndex = null) => {
    const updated = [...sundays];
    if (Array.isArray(updated[index].fields[field]) && subIndex !== null) {
      updated[index].fields[field][subIndex] = name;
    } else {
      updated[index].fields[field] = name;
    }
    updated[index].originalFields[field] = updated[index].fields[field];
    setSundays(updated);

    const key =
      subIndex !== null ? `${index}_${field}_${subIndex}` : `${index}_${field}`;
    setSuggestions((prev) => {
      const copy = { ...prev };
      delete copy[key];
      return copy;
    });
    setActiveSuggestionIndex((prev) => {
      const copy = { ...prev };
      delete copy[key];
      return copy;
    });
  };

  const handleKeyDown = (e, index, field, subIndex = null) => {
    const key =
      subIndex !== null ? `${index}_${field}_${subIndex}` : `${index}_${field}`;
    const currentSuggestions = suggestions[key] || [];
    const currentActiveIndex = activeSuggestionIndex[key] ?? -1;

    if (currentSuggestions.length === 0) return;

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setActiveSuggestionIndex((prev) => ({
          ...prev,
          [key]:
            currentActiveIndex < currentSuggestions.length - 1
              ? currentActiveIndex + 1
              : 0,
        }));
        break;

      case "ArrowUp":
        e.preventDefault();
        setActiveSuggestionIndex((prev) => ({
          ...prev,
          [key]:
            currentActiveIndex > 0
              ? currentActiveIndex - 1
              : currentSuggestions.length - 1,
        }));
        break;

      case "Enter":
        e.preventDefault();
        if (
          currentActiveIndex >= 0 &&
          currentActiveIndex < currentSuggestions.length
        ) {
          const selectedName = currentSuggestions[currentActiveIndex];
          handleSuggestionClick(index, field, selectedName, subIndex);
        } else if (currentSuggestions.length === 1) {
          // If only one suggestion, select it
          handleSuggestionClick(index, field, currentSuggestions[0], subIndex);
        }
        break;

      case "Escape":
        e.preventDefault();
        setSuggestions((prev) => {
          const copy = { ...prev };
          delete copy[key];
          return copy;
        });
        setActiveSuggestionIndex((prev) => {
          const copy = { ...prev };
          delete copy[key];
          return copy;
        });
        break;

      default:
        break;
    }
  };

  const handleMergedInputChange = (index, value) => {
    const updated = [...sundays];
    updated[index].fields["MergedContent"] = value;
    setSundays(updated);

    if (Object.keys(duplicateFields).length > 0) {
      const dups = computeDuplicates(updated);
      setDuplicateFields(dups);
    }
  };

  const deleteSunday = (index) => {
    if (sundays.length > 1) {
      const filtered = sundays.filter((_, i) => i !== index);
      setSundays(filtered);
    }
  };

  const mergeToggle = (index) => {
    const updated = [...sundays];
    const sunday = updated[index];
    if (sunday.isMerged) {
      sunday.fields = { ...sunday.originalFields };
      sunday.isMerged = false;
    } else {
      const merged = headings
        .slice(1)
        .map((field) => {
          const value = sunday.fields[field];
          if (Array.isArray(value)) {
            return value.filter(Boolean).join(", ");
          }
          return value || "";
        })
        .filter(Boolean)
        .join(" | ");
      sunday.originalFields = { ...sunday.fields };
      sunday.fields = {
        Date: sunday.fields["Date"] || "",
        MergedContent: merged,
      };
      sunday.isMerged = true;
    }
    setSundays(updated);
    setDuplicateFields({});
  };

  const addRow = () => {
    const newFields = headings.reduce(
      (acc, field) => ({
        ...acc,
        [field]: ["Scripture Reading", "Scripture Passage", "MV"].includes(
          field
        )
          ? ["", ""]
          : "",
      }),
      {}
    );
    const newSunday = {
      id: Date.now() + Math.random(),
      fields: newFields,
      originalFields: {},
      isMerged: false,
    };

    setSundays((prev) => [...prev, newSunday]);
  };

  const computeDuplicates = (data) => {
    const duplicates = {};
    const valueMap = {};

    data.forEach((row, rowIndex) => {
      if (row.isMerged) {
        const value = row.fields["MergedContent"] || "";
        const key = value.trim().toLowerCase();
        if (!valueMap[key]) valueMap[key] = [];
        valueMap[key].push({ rowIndex, field: "MergedContent" });
        return;
      }

      headings.slice(1).forEach((field) => {
        const value = row.fields[field];
        if (Array.isArray(value)) {
          value.forEach((v) => {
            const normalized = v.trim().toLowerCase();
            if (!normalized) return;
            if (!valueMap[normalized]) valueMap[normalized] = [];
            valueMap[normalized].push({ rowIndex, field });
          });
        } else {
          const normalized = (value || "").trim().toLowerCase();
          if (!normalized) return;
          if (!valueMap[normalized]) valueMap[normalized] = [];
          valueMap[normalized].push({ rowIndex, field });
        }
      });
    });

    Object.values(valueMap).forEach((entries) => {
      if (entries.length > 1) {
        entries.forEach(({ rowIndex, field }) => {
          if (!duplicates[rowIndex]) duplicates[rowIndex] = {};
          duplicates[rowIndex][field] = true;
        });
      }
    });

    return duplicates;
  };

  const checkDuplicates = () => {
    const dups = computeDuplicates(sundays);
    setDuplicateFields(dups);
  };

  if (!isInitialized) {
    return <div>Loading...</div>;
  }

  return (
    <div className="rounded-xl bg-white p-1 m-1">
      <div
        className="text-lg font-semibold text-center py-3 rounded"
        style={{ backgroundColor: bgColor, color: textColor }}
      >
        <div className="flex items-center justify-center gap-2 flex-wrap">
          <span>Order of Sunday –</span>
          <Select value={selectedMonth} onChange={handleMonthChange}>
            {monthOptions.map((month) => (
              <Select.Option key={month} value={month}>
                {month}
              </Select.Option>
            ))}
          </Select>
        </div>
      </div>

      <div
        className=" rounded-b-xl overflow-x-auto relative"
        ref={containerRef}
      >
        {/* Transition overlay */}
        {isTransitioning && (
          <div className="absolute inset-0 bg-white bg-opacity-80 flex items-center justify-center z-50">
            <div className="flex items-center gap-2">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500"></div>
              <span className="text-sm text-gray-600">
                Loading month data...
              </span>
            </div>
          </div>
        )}

        <table className="w-full text-sm">
          <thead>
            <tr style={{ backgroundColor: bgColor, color: textColor }}>
              {headings.map((heading, i) => (
                <th key={i} className="border text-center whitespace-nowrap">
                  {heading}
                </th>
              ))}
              <th className="p-2 border text-center">Actions</th>
            </tr>
          </thead>
          <tbody>
            {sundays.map((sunday, index) => (
              <tr key={sunday.id} className="even:bg-gray-100 relative">
                <td className="border-slate-300 text-center px-2">
                  <input
                    type="text"
                    placeholder="DD/MM/YYYY"
                    className="w-full border border-slate-300 rounded text-xs focus:outline-none date-input-compact"
                    style={{ height: "48px" }}
                    value={
                      sunday.fields["Date"]
                        ? formatDateToDDMMYYYY(new Date(sunday.fields["Date"]))
                        : ""
                    }
                    onChange={(e) => {
                      const input = e.target.value;
                      // Parse DD/MM/YYYY to YYYY-MM-DD for internal storage
                      const parts = input.split(/[/-]/);
                      if (parts.length === 3) {
                        const [dd, mm, yyyy] = parts;
                        if (dd && mm && yyyy && yyyy.length === 4) {
                          const isoDate = `${yyyy}-${mm.padStart(2, "0")}-${dd.padStart(2, "0")}`;
                          handleInputChange(index, "Date", isoDate);
                          setTimeout(() => {
                            const updated = [...sundays];
                            updated[index] = autoFillScriptureData(
                              updated[index]
                            );
                            setSundays(updated);
                          }, 100);
                        } else {
                          handleInputChange(index, "Date", input);
                        }
                      } else {
                        handleInputChange(index, "Date", input);
                      }
                    }}
                  />
                </td>

                {sunday.isMerged ? (
                  <td colSpan={headings.length - 1} className="p-2">
                    <input
                      type="text"
                      className={`w-full px-3 border rounded text-xs focus:outline-none ${
                        duplicateFields[index]?.["MergedContent"]
                          ? "border-red-500 bg-red-50"
                          : "border-gray-300"
                      }`}
                      style={{ height: "48px" }}
                      value={sunday.fields["MergedContent"] || ""}
                      onChange={(e) =>
                        handleMergedInputChange(index, e.target.value)
                      }
                    />
                  </td>
                ) : (
                  headings.slice(1).map((field, i) => {
                    const value = sunday.fields[field];

                    // Special handling for fields with dual inputs
                    if (
                      ["Scripture Reading", "Scripture Passage", "MV"].includes(
                        field
                      )
                    ) {
                      const arrayValue = Array.isArray(value)
                        ? value
                        : ["", ""];
                      // Ensure we have exactly 2 inputs
                      while (arrayValue.length < 2) {
                        arrayValue.push("");
                      }

                      return (
                        <td
                          key={i}
                          className="px-2 py-2  border-slate-400 relative"
                        >
                          <div className="flex flex-col gap-1">
                            {arrayValue.slice(0, 2).map((val, subIdx) => {
                              const subKey = `${index}_${field}_${subIdx}`;
                              const currentSuggestions =
                                suggestions[subKey] || [];
                              const currentActiveIndex =
                                activeSuggestionIndex[subKey] ?? -1;

                              return (
                                <div key={subKey} className="relative">
                                  <input
                                    ref={(el) => {
                                      if (el) inputRefs.current[subKey] = el;
                                    }}
                                    type="text"
                                    className={`w-full px-2 border rounded text-xs focus:outline-none ${
                                      duplicateFields[index]?.[field]
                                        ? "border-red-500 bg-red-50"
                                        : "border-gray-300"
                                    }`}
                                    style={{ height: "28px" }}
                                    value={val || ""}
                                    onChange={(e) =>
                                      handleInputChange(
                                        index,
                                        field,
                                        e.target.value,
                                        subIdx
                                      )
                                    }
                                    onKeyDown={(e) =>
                                      handleKeyDown(e, index, field, subIdx)
                                    }
                                  />
                                  {currentSuggestions.length > 0 && (
                                    <ul className="absolute z-40 bg-white border border-gray-300 mt-1 rounded-md shadow-lg w-full max-h-40 overflow-y-auto">
                                      {currentSuggestions.map(
                                        (name, suggestionIdx) => (
                                          <li
                                            key={suggestionIdx}
                                            onClick={() =>
                                              handleSuggestionClick(
                                                index,
                                                field,
                                                name,
                                                subIdx
                                              )
                                            }
                                            className={`px-3 py-2 text-xs cursor-pointer transition-all ${
                                              suggestionIdx ===
                                              currentActiveIndex
                                                ? "bg-indigo-200"
                                                : "hover:bg-indigo-100"
                                            }`}
                                          >
                                            {name}
                                          </li>
                                        )
                                      )}
                                    </ul>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </td>
                      );
                    }

                    // Handle other array fields (if any)
                    if (Array.isArray(value)) {
                      return (
                        <td key={i} className="p-2 border relative">
                          {value.map((val, subIdx) => {
                            const subKey = `${index}_${field}_${subIdx}`;
                            const currentSuggestions =
                              suggestions[subKey] || [];
                            const currentActiveIndex =
                              activeSuggestionIndex[subKey] ?? -1;

                            return (
                              <div key={subIdx} className="mb-1 relative">
                                <input
                                  ref={(el) => {
                                    if (el) inputRefs.current[subKey] = el;
                                  }}
                                  type="text"
                                  className={`w-full px-3 border rounded text-xs focus:outline-none ${
                                    duplicateFields[index]?.[field]
                                      ? "border-red-500 bg-red-50"
                                      : "border-gray-300"
                                  }`}
                                  style={{ height: "48px" }}
                                  value={val || ""}
                                  onChange={(e) =>
                                    handleInputChange(
                                      index,
                                      field,
                                      e.target.value,
                                      subIdx
                                    )
                                  }
                                  onKeyDown={(e) =>
                                    handleKeyDown(e, index, field, subIdx)
                                  }
                                />
                                {currentSuggestions.length > 0 && (
                                  <ul className="absolute z-40 bg-white border border-gray-300 mt-1 rounded-md shadow-lg w-full max-h-40 overflow-y-auto">
                                    {currentSuggestions.map(
                                      (name, suggestionIdx) => (
                                        <li
                                          key={suggestionIdx}
                                          onClick={() =>
                                            handleSuggestionClick(
                                              index,
                                              field,
                                              name,
                                              subIdx
                                            )
                                          }
                                          className={`px-3 py-2 text-xs cursor-pointer transition-all ${
                                            suggestionIdx === currentActiveIndex
                                              ? "bg-indigo-200"
                                              : "hover:bg-indigo-100"
                                          }`}
                                        >
                                          {name}
                                        </li>
                                      )
                                    )}
                                  </ul>
                                )}
                              </div>
                            );
                          })}
                        </td>
                      );
                    }

                    // Handle regular string fields
                    const key = `${index}_${field}`;
                    const currentSuggestions = suggestions[key] || [];
                    const currentActiveIndex = activeSuggestionIndex[key] ?? -1;

                    return (
                      <td key={i} className="p-2  relative">
                        <input
                          ref={(el) => {
                            if (el) inputRefs.current[key] = el;
                          }}
                          type="text"
                          className={`w-full px-3 border rounded text-xs focus:outline-none ${
                            duplicateFields[index]?.[field]
                              ? "border-red-500 bg-red-50"
                              : "border-gray-300"
                          }`}
                          style={{ height: "48px" }}
                          value={value || ""}
                          onChange={(e) =>
                            handleInputChange(index, field, e.target.value)
                          }
                          onKeyDown={(e) => handleKeyDown(e, index, field)}
                        />
                        {currentSuggestions.length > 0 && (
                          <ul className="absolute z-40 bg-white border border-gray-300 mt-1 rounded-md shadow-lg w-full max-h-40 overflow-y-auto">
                            {currentSuggestions.map((name, suggestionIdx) => (
                              <li
                                key={suggestionIdx}
                                onClick={() =>
                                  handleSuggestionClick(index, field, name)
                                }
                                className={`px-3 py-2 text-xs cursor-pointer transition-all ${
                                  suggestionIdx === currentActiveIndex
                                    ? "bg-indigo-200"
                                    : "hover:bg-indigo-100"
                                }`}
                              >
                                {name}
                              </li>
                            ))}
                          </ul>
                        )}
                      </td>
                    );
                  })
                )}

                <td className="p-2  text-center">
                  <div
                    className="flex justify-center gap-2 sm:gap-3"
                    style={{ height: "48px", alignItems: "center" }}
                  >
                    <button
                      onClick={() => deleteSunday(index)}
                      className="text-red-500 hover:text-red-700"
                      title="Delete"
                    >
                      <TrashIcon />
                    </button>
                    <button
                      onClick={() => mergeToggle(index)}
                      className="text-blue-500 hover:text-blue-700"
                      title={sunday.isMerged ? "Unmerge" : "Merge"}
                    >
                      {sunday.isMerged ? <UnmergeIcon /> : <MergeIcon />}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="flex justify-end px-4 py-3 gap-3">
          <button
            onClick={checkDuplicates}
            className="px-3 py-1.5 text-sm bg-yellow-600 text-white cursor-pointer rounded hover:bg-yellow-700 transition"
          >
            Check Duplicates
          </button>

          <button
            onClick={addRow}
            className="px-4 py-1.5 text-sm bg-[#640D6B] cursor-pointer text-white rounded hover:bg-[#4d0853] transition"
          >
            + Add Row
          </button>
        </div>
      </div>

      <BirthdayAnniversaryTable
        selectedMonth={selectedMonth}
        bgColor={bgColor}
        textColor={textColor}
        activeYear={activeYear}
      />
    </div>
  );
}

import React, { useState, useRef, useEffect, useCallback } from "react";
import { ChromePicker } from "react-color";
import MonthSection from "./MonthSection";
import { generatePDF } from "../utils/pdfGenerator";
import { monthOptions, headings } from "../constants";
import { saveSundayRoles, getSundayRoles } from "../utils/firebaseHelpers";
import LoadingOverlay from "./LoadingOverlay";
import rolesList from "../data/rolesList.json";
import scripturePortions from "../data/scripturePortion.json";

// ============================================
// 🔧 CHANGE THIS WHEN NEW YEAR COMES
// ============================================
const CURRENT_YEAR = 2026;  // 👈 Just change this number next year
// ============================================

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

const formatDateToYYYYMMDD = (date) => {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
};

const formatDateToDDMMYYYY = (date) => {
  const dd = String(date.getDate()).padStart(2, "0");
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const yyyy = date.getFullYear();
  return `${dd}-${mm}-${yyyy}`;
};

export default function SundayRolesAssign() {
  const [hasFetchedOnce, setHasFetchedOnce] = useState(false);
  const [bgColor, setBgColor] = useState("#0a2942");
  const [textColor, setTextColor] = useState("#ffffff");
  const [showBgPicker, setShowBgPicker] = useState(false);
  const [showTextPicker, setShowTextPicker] = useState(false);
  const [monthData, setMonthData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [autoGenerating, setAutoGenerating] = useState(false);
  const [resetKey, setResetKey] = useState(0);
  const [pdfFontSize, setPdfFontSize] = useState(12);
  const [pdfCellPadding, setPdfCellPadding] = useState(2.2);
  const [pdfHeight, setPdfHeight] = useState(400);

  const bgPickerRef = useRef(null);
  const textPickerRef = useRef(null);
  const bgButtonRef = useRef(null);
  const textButtonRef = useRef(null);

  // Generate default month data for current year
  const generateDefaultMonthData = useCallback(() => {
    console.log(`🔧 Generating data for year: ${CURRENT_YEAR}`);
    
    // Show first 3 months of the year (January, February, March)
    const monthsToShow = [0, 1, 2];

    return monthsToShow.map((monthIndex) => {
      const sundays = getSundaysInMonth(monthIndex, CURRENT_YEAR).map((date) => {
        console.log(`📍 Creating Sunday: ${formatDateToYYYYMMDD(date)}`);
        return {
          id: Date.now() + Math.random(),
          fields: {
            Date: formatDateToYYYYMMDD(date),
            "Scripture Reading": ["", ""],
            "Scripture Passage": ["", ""],
            "MV": ["", ""],
          },
          originalFields: {},
          isMerged: false,
        };
      });
      
      return { 
        selectedMonth: monthOptions[monthIndex], 
        sundays 
      };
    });
  }, []);

  const handleGeneratePDF = useCallback(() => {
    generatePDF(
      monthData,
      bgColor,
      textColor,
      pdfFontSize,
      pdfCellPadding,
      pdfHeight
    );
  }, [monthData, bgColor, textColor, pdfFontSize, pdfCellPadding, pdfHeight]);

  const loadData = useCallback(async () => {
    console.log(`🔄 Loading data for year: ${CURRENT_YEAR}`);
    setLoading(true);
    try {
      const saved = await getSundayRoles(CURRENT_YEAR.toString());
      if (saved?.monthData?.length === 3) {
        console.log(`✅ Loaded saved data for ${CURRENT_YEAR}`);
        const normalized = saved.monthData.map((monthBlock) => {
          const sundays = monthBlock.sundays.map((s) => {
            const updatedFields = { ...s.fields };
            // Ensure arrays are properly initialized
            ["Scripture Reading", "Scripture Passage", "MV"].forEach(field => {
              if (!Array.isArray(updatedFields[field])) {
                updatedFields[field] = ["", ""];
              } else if (updatedFields[field].length < 2) {
                while (updatedFields[field].length < 2) {
                  updatedFields[field].push("");
                }
              }
            });
            return { ...s, fields: updatedFields };
          });
          return { ...monthBlock, sundays };
        });
        setMonthData(normalized);
        setBgColor(saved.bgColor || "#0a2942");
        setTextColor(saved.textColor || "#ffffff");
      } else {
        console.log(`📝 No saved data, generating fresh for ${CURRENT_YEAR}`);
        setMonthData(generateDefaultMonthData());
      }
    } catch (err) {
      console.error("Firebase load error:", err);
      setMonthData(generateDefaultMonthData());
    } finally {
      setLoading(false);
      setHasFetchedOnce(true);
    }
  }, [generateDefaultMonthData]);

  // Initial load only
  useEffect(() => {
    if (!hasFetchedOnce) {
      loadData();
    }
  }, [loadData, hasFetchedOnce]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        bgPickerRef.current &&
        !bgPickerRef.current.contains(event.target) &&
        bgButtonRef.current &&
        !bgButtonRef.current.contains(event.target)
      ) {
        setShowBgPicker(false);
      }
      if (
        textPickerRef.current &&
        !textPickerRef.current.contains(event.target) &&
        textButtonRef.current &&
        !textButtonRef.current.contains(event.target)
      ) {
        setShowTextPicker(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const registerData = useCallback((monthIndex, data) => {
    setMonthData((prev) => {
      const updated = [...prev];
      updated[monthIndex] = {
        ...updated[monthIndex],
        selectedMonth: data.selectedMonth,
        sundays: data.sundays,
      };
      return updated;
    });
  }, []);

  const handleSave = async () => {
    setLoading(true);
    try {
      await saveSundayRoles({ 
        monthData, 
        bgColor, 
        textColor, 
        activeYear: CURRENT_YEAR.toString() 
      });
      alert(`✅ Data saved successfully for ${CURRENT_YEAR}!`);
    } catch (err) {
      console.error("Save error:", err);
      alert("❌ Error saving data. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    const clearedData = monthData.map((month) => {
      const clearedSundays = month.sundays.map((sunday) => ({
        ...sunday,
        fields: {
          ...Object.keys(sunday.fields).reduce((acc, key) => {
            acc[key] =
              key === "Date"
                ? sunday.fields[key]
                : ["Scripture Reading", "Scripture Passage", "MV"].includes(key)
                ? ["", ""]
                : "";
            return acc;
          }, {}),
        },
        originalFields: {},
        isMerged: false,
      }));
      return { ...month, sundays: clearedSundays };
    });

    setMonthData(clearedData);
    setResetKey((prev) => prev + 1);
    alert("🧹 All inputs have been cleared.");
  };

  const toProperCase = (str) =>
    str
      .toLowerCase()
      .split(" ")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");

  const autoGenerate = async () => {
    console.log("🔁 Auto generation started");
    setAutoGenerating(true);

    try {
      await new Promise((resolve) => setTimeout(resolve, 100));

      const headingMap = {
        "Opening Prayer": "openingprayer",
        "Praise & Worship": "praiseandworship",
        "Scripture Reading": "reading",
        "Intercessory Prayer": "intercessory",
        "Offertory Prayer": "offertoryprayer",
      };

      const availableNamesByRole = {};
      const allAvailableNames = new Set();

      Object.keys(headingMap).forEach((heading) => {
        const key = headingMap[heading];
        if (key === "reading") {
          availableNamesByRole[heading] = {
            kids: [...(rolesList.sevinisunday?.kids || [])],
            adults: [...(rolesList.reading || [])],
          };
          [
            ...(rolesList.sevinisunday?.kids || []),
            ...(rolesList.reading || []),
          ].forEach((person) => {
            if (person?.name) {
              allAvailableNames.add(person.name.toLowerCase());
            }
          });
        } else {
          availableNamesByRole[heading] = [...(rolesList[key] || [])];
          (rolesList[key] || []).forEach((person) => {
            if (person?.name) {
              allAvailableNames.add(person.name.toLowerCase());
            }
          });
        }
      });

      console.log("📊 Total available people:", allAvailableNames.size);

      const globalPersonRoleCounts = {};
      const globalPersonLastAssigned = {};
      const globalRoleAssignments = {};

      allAvailableNames.forEach((name) => {
        globalPersonRoleCounts[name] = 0;
        globalPersonLastAssigned[name] = -10;
        globalRoleAssignments[name] = [];
      });

      const getEligibleCandidates = (heading, isFirstSundayOfMonth) => {
        let candidates = [];

        if (heading === "Scripture Reading") {
          if (isFirstSundayOfMonth) {
            candidates = availableNamesByRole[heading]?.kids || [];
          } else {
            candidates = availableNamesByRole[heading]?.adults || [];
          }
        } else {
          candidates = availableNamesByRole[heading] || [];
        }

        return candidates.filter((person) => person?.name);
      };

      const getAssignmentPosition = (monthIndex, sundayIndex) => {
        return monthIndex * 10 + sundayIndex;
      };

      const getWeightedRandomSelection = (
        candidates,
        currentPosition,
        monthUsedNames
      ) => {
        if (candidates.length === 0) return [];

        const weighted = candidates.map((person) => {
          const name = person.name.toLowerCase();
          const globalRoleCount = globalPersonRoleCounts[name] || 0;
          const lastAssigned = globalPersonLastAssigned[name] || -10;
          const timeSinceAssigned = currentPosition - lastAssigned;

          let weight = 100;

          if (monthUsedNames.has(name)) {
            weight -= 60;
          }

          weight += Math.max(0, 10 - globalRoleCount) * 10;
          weight += Math.min(timeSinceAssigned * 5, 50);

          if (globalRoleCount === 0) {
            weight += 20;
          }

          weight = Math.max(weight, 5);

          return { person, weight, name };
        });

        weighted.sort((a, b) => {
          const weightDiff = b.weight - a.weight;
          if (Math.abs(weightDiff) < 10) {
            return Math.random() - 0.5;
          }
          return weightDiff;
        });

        return weighted.map((w) => w.person);
      };

      const selectFromUsedNames = (candidates, monthUsedNames) => {
        const usedCandidates = candidates.filter((person) =>
          monthUsedNames.has(person.name.toLowerCase())
        );

        if (usedCandidates.length === 0) return null;

        const sortedUsed = usedCandidates.sort((a, b) => {
          const aLastPos = globalPersonLastAssigned[a.name.toLowerCase()] || -10;
          const bLastPos = globalPersonLastAssigned[b.name.toLowerCase()] || -10;
          return aLastPos - bLastPos;
        });

        return sortedUsed[0];
      };

      const updated = monthData.map((monthBlock, monthIndex) => {
        console.log(`\n🗓️ Processing Month ${monthIndex + 1}: ${monthBlock.selectedMonth}`);

        const monthUsedNames = new Set();
        const monthAssignments = new Map();

        const sundays = monthBlock.sundays.map((sunday, sundayIndex) => {
          const newFields = { Date: sunday.fields.Date };
          const isFirstSundayOfMonth = sundayIndex === 0;
          const currentPosition = getAssignmentPosition(monthIndex, sundayIndex);

          console.log(`\n📅 Month ${monthIndex + 1}, Sunday ${sundayIndex + 1} (Date: ${sunday.fields.Date})`);

          const dateStr = formatDateToDDMMYYYY(new Date(sunday.fields.Date));
          const scriptureInfo = scripturePortions.scripturePortions[CURRENT_YEAR]?.find(
            (item) => item.date === dateStr
          );

          if (scriptureInfo) {
            if (scriptureInfo.scriptures.length >= 2) {
              newFields["Scripture Passage"] = [
                scriptureInfo.scriptures[0].passage,
                scriptureInfo.scriptures[1].passage,
              ];
              newFields["MV"] = [
                scriptureInfo.scriptures[0].mv,
                scriptureInfo.scriptures[1].mv,
              ];
            } else if (scriptureInfo.scriptures.length === 1) {
              newFields["Scripture Passage"] = [scriptureInfo.scriptures[0].passage, ""];
              newFields["MV"] = [scriptureInfo.scriptures[0].mv, ""];
            } else {
              newFields["Scripture Passage"] = ["", ""];
              newFields["MV"] = ["", ""];
            }

            const messageThemeObj = scriptureInfo.scriptures.find((s) => s.messageTheme);
            if (messageThemeObj) {
              newFields["Message Theme"] = messageThemeObj.messageTheme;
            }
          }

          newFields["Message"] = "";

          headings.slice(1).forEach((heading) => {
            if (["Scripture Passage", "MV", "Message Theme", "Message"].includes(heading)) {
              return;
            }

            const requiredCount = heading === "Scripture Reading" ? 2 : 1;
            const eligibleCandidates = getEligibleCandidates(heading, isFirstSundayOfMonth);

            if (eligibleCandidates.length === 0) {
              if (heading === "Scripture Reading") {
                newFields[heading] = ["TBD", "TBD"];
              } else {
                newFields[heading] = "TBD";
              }
              return;
            }

            const selectedNames = [];
            const prioritizedCandidates = getWeightedRandomSelection(
              eligibleCandidates,
              currentPosition,
              monthUsedNames
            );

            const availableInMonth = prioritizedCandidates.filter(
              (person) => !monthUsedNames.has(person.name.toLowerCase())
            );

            let assignedCount = 0;

            for (let i = 0; i < availableInMonth.length && assignedCount < requiredCount; i++) {
              const selectedPerson = availableInMonth[i];
              const properName = toProperCase(selectedPerson.name);
              const lowerName = selectedPerson.name.toLowerCase();

              selectedNames.push(properName);
              monthUsedNames.add(lowerName);

              if (!monthAssignments.has(lowerName)) {
                monthAssignments.set(lowerName, []);
              }
              monthAssignments.get(lowerName).push(currentPosition);

              globalPersonRoleCounts[lowerName] = (globalPersonRoleCounts[lowerName] || 0) + 1;
              globalPersonLastAssigned[lowerName] = currentPosition;

              if (!globalRoleAssignments[lowerName]) {
                globalRoleAssignments[lowerName] = [];
              }
              globalRoleAssignments[lowerName].push(
                `${heading} (M${monthIndex + 1}S${sundayIndex + 1})`
              );

              assignedCount++;
            }

            while (assignedCount < requiredCount) {
              const fallbackPerson = selectFromUsedNames(eligibleCandidates, monthUsedNames);

              if (fallbackPerson) {
                const properName = toProperCase(fallbackPerson.name);
                const lowerName = fallbackPerson.name.toLowerCase();

                selectedNames.push(properName);

                if (!monthAssignments.has(lowerName)) {
                  monthAssignments.set(lowerName, []);
                }
                monthAssignments.get(lowerName).push(currentPosition);

                globalPersonRoleCounts[lowerName] = (globalPersonRoleCounts[lowerName] || 0) + 1;
                globalPersonLastAssigned[lowerName] = currentPosition;

                if (!globalRoleAssignments[lowerName]) {
                  globalRoleAssignments[lowerName] = [];
                }
                globalRoleAssignments[lowerName].push(
                  `${heading} (M${monthIndex + 1}S${sundayIndex + 1})`
                );

                assignedCount++;
              } else {
                selectedNames.push("TBD");
                assignedCount++;
              }
            }

            if (heading === "Scripture Reading") {
              newFields[heading] = selectedNames.slice(0, 2);
            } else {
              newFields[heading] = selectedNames[0];
            }
          });

          return {
            ...sunday,
            fields: newFields,
            originalFields: { ...newFields },
          };
        });

        return { ...monthBlock, sundays };
      });

      const peopleWithRoles = Object.values(globalPersonRoleCounts).filter(
        (count) => count > 0
      ).length;
      const totalPeople = allAvailableNames.size;
      const totalAssignments = Object.values(globalPersonRoleCounts).reduce(
        (sum, count) => sum + count,
        0
      );

      const tbdCount = JSON.stringify(updated).split('"TBD"').length - 1;

      setMonthData(updated);
      setResetKey((prev) => prev + 1);

      let message = `Auto-generation completed!\n\n✅ ${peopleWithRoles} out of ${totalPeople} people assigned roles\n📈 Total assignments: ${totalAssignments}`;

      if (tbdCount > 0) {
        message += `\n⚠️ ${tbdCount} positions marked as "TBD"`;
      } else {
        message += `\n🎉 All positions filled!`;
      }

      alert(message);
    } catch (error) {
      console.error("Error in auto generation:", error);
      alert("An error occurred during auto generation. Please try again.");
    } finally {
      setAutoGenerating(false);
    }
  };

  return (
    <div className="px-4 pt-8 pb-12 w-[98vw] mx-auto font-poppins">
      {(loading || autoGenerating) && <LoadingOverlay loading={true} />}
      <div className="flex justify-between items-start flex-wrap mb-4">
        <h2 className="text-2xl font-bold text-[#640D6B]">
          📋 Assign Roles for Upcoming Sundays - {CURRENT_YEAR}
        </h2>
        <div className="flex gap-5 flex-wrap items-start">
          <div className="text-center relative">
            <p className="font-medium mb-1">BG Color</p>
            <button
              ref={bgButtonRef}
              onClick={() => {
                setShowBgPicker(!showBgPicker);
                setShowTextPicker(false);
              }}
              className="w-10 h-5 rounded cursor-pointer border shadow"
              style={{ backgroundColor: bgColor }}
            />
            {showBgPicker && (
              <div ref={bgPickerRef} className="absolute z-50 mt-2">
                <ChromePicker color={bgColor} onChange={(c) => setBgColor(c.hex)} disableAlpha />
              </div>
            )}
          </div>
          <div className="text-center relative">
            <p className="font-medium mb-1">Text Color</p>
            <button
              ref={textButtonRef}
              onClick={() => {
                setShowTextPicker(!showTextPicker);
                setShowBgPicker(false);
              }}
              className="w-10 h-5 rounded border cursor-pointer shadow"
              style={{ backgroundColor: textColor }}
            />
            {showTextPicker && (
              <div ref={textPickerRef} className="absolute z-50 mt-2">
                <ChromePicker color={textColor} onChange={(c) => setTextColor(c.hex)} disableAlpha />
              </div>
            )}
          </div>
          <div className="text-center mt-6">
            <button
              onClick={autoGenerate}
              disabled={!hasFetchedOnce || autoGenerating}
              className={`px-4 py-1.5 rounded transition cursor-pointer text-white ${
                hasFetchedOnce && !autoGenerating
                  ? "bg-green-600 hover:bg-green-700"
                  : "bg-gray-400 cursor-not-allowed"
              }`}
            >
              {autoGenerating ? "Generating..." : "Auto Generate"}
            </button>
          </div>
        </div>
      </div>
      <div className="flex gap-5 relative left-2 items-center mt-2">
        <div className="text-center">
          <p className="font-medium mb-1 text-sm">PDF Font Size</p>
          <div className="flex items-center gap-2">
            <input
              type="range"
              min="8"
              max="16"
              step="0.5"
              value={pdfFontSize}
              onChange={(e) => setPdfFontSize(parseFloat(e.target.value))}
              className="w-16"
            />
            <span className="text-sm font-mono w-8">{pdfFontSize}</span>
          </div>
        </div>
        <div className="text-center">
          <p className="font-medium mb-1 text-sm">PDF Cell Spacing</p>
          <div className="flex items-center gap-2">
            <input
              type="range"
              min="1"
              max="4"
              step="0.1"
              value={pdfCellPadding}
              onChange={(e) => setPdfCellPadding(parseFloat(e.target.value))}
              className="w-16"
            />
            <span className="text-sm font-mono w-8">{pdfCellPadding}</span>
          </div>
        </div>
        <button
          onClick={() => {
            setPdfFontSize(12);
            setPdfCellPadding(2.2);
          }}
          className="px-4 py-2 text-sm cursor-pointer hover:text-white bg-gray-300 text-gray-700 rounded hover:bg-gray-400 transition"
        >
          Reset
        </button>
        <label className="text-sm">
          PDF Page Height:
          <input
            type="number"
            className="p-1 rounded"
            value={pdfHeight}
            onChange={(e) => setPdfHeight(Number(e.target.value))}
            style={{
              marginLeft: "8px",
              width: "60px",
              textAlign: "center",
              border: "1px solid #DDDDDD",
            }}
          />
        </label>
      </div>
      {monthData.length === 3 &&
        [0, 1, 2].map((i) => (
          <MonthSection
            key={`${CURRENT_YEAR}-${i}-${resetKey}`}
            monthIndex={i}
            bgColor={bgColor}
            textColor={textColor}
            registerData={registerData}
            initialData={monthData[i]}
            activeYear={CURRENT_YEAR}
            scripturePortions={scripturePortions}
          />
        ))}
      <div className="flex justify-end gap-4 px-4 py-3">
        <button
          onClick={handleReset}
          className="px-4 py-1.5 cursor-pointer text-sm bg-[#a72222] text-white rounded hover:bg-[#8b1c1c] transition"
        >
          Reset All
        </button>
        <button
          onClick={handleGeneratePDF}
          className="px-4 py-1.5 text-sm cursor-pointer bg-[#0a2942] text-white rounded hover:bg-[#081c2f] transition"
        >
          Publish to PDF
        </button>
        <button
          onClick={handleSave}
          className="px-4 py-1.5 text-sm cursor-pointer bg-[#640D6B] text-white rounded hover:bg-[#4d0853] transition"
        >
          Save to Firebase
        </button>
      </div>
    </div>
  );
}
import React, { useState, useRef, useEffect, useCallback } from "react";
import { ChromePicker } from "react-color";
import MonthSection from "./MonthSection";
import { generatePDF } from "../utils/pdfGenerator";
import { monthOptions, headings } from "../constants";
import { saveSundayRoles, getSundayRoles } from "../utils/firebaseHelpers";
import LoadingOverlay from "./LoadingOverlay";
import rolesList from "../data/rolesList.json";
import scripturePortions from "../data/scripturePortion.json";

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

const allowedYears = ["2025", "2026", "2027"];

// Define the months that should have scripture portions (July to December for 2025)
const getValidMonthsForYear = (year) => {
  if (year === "2025") {
    return [6, 7, 8, 9, 10, 11]; // July to December (0-indexed)
  }
  // Add logic for other years as needed
  return [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]; // All months for other years
};

export default function SundayRolesAssign() {
  const [hasFetchedOnce, setHasFetchedOnce] = useState(false);
  const [bgColor, setBgColor] = useState("#0a2942");
  const [textColor, setTextColor] = useState("#ffffff");
  const [showBgPicker, setShowBgPicker] = useState(false);
  const [showTextPicker, setShowTextPicker] = useState(false);
  const [activeYear, setActiveYear] = useState("2025");
  const [monthData, setMonthData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [autoGenerating, setAutoGenerating] = useState(false);
  const [resetKey, setResetKey] = useState(0);
  // Fixed: Moved these state declarations inside the component
  const [pdfFontSize, setPdfFontSize] = useState(12);
  const [pdfCellPadding, setPdfCellPadding] = useState(2.2);
  const [pdfHeight, setPdfHeight] = useState(400); // default height

  const bgPickerRef = useRef(null);
  const textPickerRef = useRef(null);
  const bgButtonRef = useRef(null);
  const textButtonRef = useRef(null);

  const generateDefaultMonthData = useCallback((year) => {
    const validMonths = getValidMonthsForYear(year);
    // For 2025, start from July (index 6), but we only show first 3 months of valid range
    const startIndex = year === "2025" ? 6 : 0;
    const monthsToShow = validMonths.slice(0, 3);

    return monthsToShow.map((monthIndex) => {
      const sundays = getSundaysInMonth(monthIndex, parseInt(year)).map(
        (date) => ({
          id: Date.now() + Math.random(),
          fields: {
            Date: formatDateToYYYYMMDD(date),
            "Scripture Reading": ["", ""], // Always 2 inputs
          },
          originalFields: {},
          isMerged: false,
        })
      );
      return { selectedMonth: monthOptions[monthIndex], sundays };
    });
  }, []);

  // Fixed: Moved handleGeneratePDF inside component to access state variables
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

  const loadData = useCallback(
    async (yearToLoad) => {
      setLoading(true);
      try {
        const saved = await getSundayRoles(yearToLoad);
        if (saved?.monthData?.length === 3) {
          const normalized = saved.monthData.map((monthBlock) => {
            const sundays = monthBlock.sundays.map((s) => {
              const updatedFields = { ...s.fields };
              if (!Array.isArray(updatedFields["Scripture Reading"])) {
                updatedFields["Scripture Reading"] = ["", ""]; // Always 2 inputs
              } else if (updatedFields["Scripture Reading"].length < 2) {
                while (updatedFields["Scripture Reading"].length < 2) {
                  updatedFields["Scripture Reading"].push("");
                }
              }
              return { ...s, fields: updatedFields };
            });
            return { ...monthBlock, sundays };
          });
          setMonthData(normalized);
          setBgColor(saved.bgColor || "#0a2942");
          setTextColor(saved.textColor || "#ffffff");
        } else {
          setMonthData(generateDefaultMonthData(yearToLoad));
        }
      } catch (err) {
        console.error("Firebase load error:", err);
        setMonthData(generateDefaultMonthData(yearToLoad));
      } finally {
        setLoading(false);
        setHasFetchedOnce(true);
      }
    },
    [generateDefaultMonthData]
  );

  // Fixed: Added missing dependencies
  useEffect(() => {
    loadData(activeYear);
  }, [loadData, activeYear]);

  useEffect(() => {
    if (hasFetchedOnce) {
      loadData(activeYear);
    }
  }, [activeYear, hasFetchedOnce, loadData]);

  // Fixed: Added click outside handlers to close color pickers
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
      await saveSundayRoles({ monthData, bgColor, textColor, activeYear });
    } catch (err) {
      console.error("Save error:", err);
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
                : key === "Scripture Reading"
                ? ["", ""] // Always 2 blank inputs
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
    alert("All inputs have been cleared.");
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
      // Add a small delay to show the loading state
      await new Promise((resolve) => setTimeout(resolve, 100));

      const headingMap = {
        "Opening Prayer": "openingprayer",
        "Praise & Worship": "praiseandworship",
        "Scripture Reading": "reading",
        "Intercessory Prayer": "intercessory",
        "Offertory Prayer": "offertoryprayer",
      };

      // Initialize available names for each role
      const availableNamesByRole = {};
      const allAvailableNames = new Set();

      Object.keys(headingMap).forEach((heading) => {
        const key = headingMap[heading];
        if (key === "reading") {
          availableNamesByRole[heading] = {
            kids: [...(rolesList.sevinisunday?.kids || [])],
            adults: [...(rolesList.reading || [])], // Changed from sevinisunday.adults to rolesList.reading
          };
          // Add all names to our tracking set
          [
            ...(rolesList.sevinisunday?.kids || []),
            ...(rolesList.reading || []), // Changed from sevinisunday.adults to rolesList.reading
          ].forEach((person) => {
            if (person?.name) {
              allAvailableNames.add(person.name.toLowerCase());
            }
          });
        } else {
          availableNamesByRole[heading] = [...(rolesList[key] || [])];
          // Add all names to our tracking set
          (rolesList[key] || []).forEach((person) => {
            if (person?.name) {
              allAvailableNames.add(person.name.toLowerCase());
            }
          });
        }
      });

      console.log("📊 Total available people:", allAvailableNames.size);

      // Global tracking across all months
      const globalPersonRoleCounts = {};
      const globalPersonLastAssigned = {};
      const globalRoleAssignments = {};

      // Initialize global tracking
      allAvailableNames.forEach((name) => {
        globalPersonRoleCounts[name] = 0;
        globalPersonLastAssigned[name] = -10;
        globalRoleAssignments[name] = [];
      });

      // Helper function to shuffle array (Fisher-Yates shuffle)
      const shuffleArray = (array) => {
        const shuffled = [...array];
        for (let i = shuffled.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }
        return shuffled;
      };

      // Helper function to get eligible candidates for a role
      const getEligibleCandidates = (heading, isFirstSundayOfMonth) => {
        let candidates = [];

        if (heading === "Scripture Reading") {
          if (isFirstSundayOfMonth) {
            candidates = availableNamesByRole[heading]?.kids || [];
          } else {
            candidates = availableNamesByRole[heading]?.adults || [];
          }
        } else if (heading === "Opening Prayer") {
          candidates = availableNamesByRole[heading] || [];
        } else {
          // For other roles, don't differentiate between first Sunday and others
          candidates = availableNamesByRole[heading] || [];
        }

        return candidates.filter((person) => person?.name);
      };

      // Helper function to calculate assignment position (month * 10 + sunday index)
      const getAssignmentPosition = (monthIndex, sundayIndex) => {
        return monthIndex * 10 + sundayIndex;
      };

      // Enhanced weighted selection that considers both global and monthly usage
      const getWeightedRandomSelection = (
        candidates,
        currentPosition,
        monthUsedNames,
        monthIndex,
        sundayIndex,
        heading
      ) => {
        if (candidates.length === 0) return [];

        // Calculate weights for each candidate
        const weighted = candidates.map((person) => {
          const name = person.name.toLowerCase();
          const globalRoleCount = globalPersonRoleCounts[name] || 0;
          const lastAssigned = globalPersonLastAssigned[name] || -10;
          const timeSinceAssigned = currentPosition - lastAssigned;

          // Penalties and bonuses
          let weight = 100; // Base weight

          // Heavily penalize if used in same month (but don't completely exclude)
          if (monthUsedNames.has(name)) {
            weight -= 60;
          }

          // Bonus for fewer global assignments
          weight += Math.max(0, 10 - globalRoleCount) * 10;

          // Bonus for longer time since last assignment
          weight += Math.min(timeSinceAssigned * 5, 50);

          // Small bonus for people who haven't been assigned at all
          if (globalRoleCount === 0) {
            weight += 20;
          }

          // Ensure minimum weight
          weight = Math.max(weight, 5);

          return {
            person,
            weight,
            name,
            debug: {
              name: person.name,
              globalRoleCount,
              timeSinceAssigned,
              usedInMonth: monthUsedNames.has(name),
              weight,
            },
          };
        });

        // Sort by weight (descending) with some randomization for similar weights
        weighted.sort((a, b) => {
          const weightDiff = b.weight - a.weight;
          if (Math.abs(weightDiff) < 10) {
            // Add randomness for similar weights
            return Math.random() - 0.5;
          }
          return weightDiff;
        });

        console.log(
          `🎯 M${monthIndex + 1}S${sundayIndex + 1} ${heading} candidates:`,
          weighted.slice(0, 5).map((w) => `${w.name}(${w.weight})`)
        );

        return weighted.map((w) => w.person);
      };

      // Fallback selection when we need to use someone already used in the month
      const selectFromUsedNames = (
        candidates,
        monthUsedNames,
        currentPosition
      ) => {
        const usedCandidates = candidates.filter((person) =>
          monthUsedNames.has(person.name.toLowerCase())
        );

        if (usedCandidates.length === 0) return null;

        // Among already used people, prefer those used longer ago
        const sortedUsed = usedCandidates.sort((a, b) => {
          const aLastPos =
            globalPersonLastAssigned[a.name.toLowerCase()] || -10;
          const bLastPos =
            globalPersonLastAssigned[b.name.toLowerCase()] || -10;
          return aLastPos - bLastPos; // Earlier assignment first
        });

        return sortedUsed[0];
      };

      // Process all months
      const updated = monthData.map((monthBlock, monthIndex) => {
        console.log(
          `\n🗓️ Processing Month ${monthIndex + 1}: ${monthBlock.selectedMonth}`
        );

        // Track names used in this month with their positions
        const monthUsedNames = new Set();
        const monthAssignments = new Map(); // name -> [positions]

        const sundays = monthBlock.sundays.map((sunday, sundayIndex) => {
          const newFields = { Date: sunday.fields.Date };
          const isFirstSundayOfMonth = sundayIndex === 0;
          const currentPosition = getAssignmentPosition(
            monthIndex,
            sundayIndex
          );

          console.log(
            `\n📅 Month ${monthIndex + 1}, Sunday ${
              sundayIndex + 1
            } (Position: ${currentPosition})`
          );

          // Fill scripture passages, MV, and message theme from JSON
          const dateStr = formatDateToDDMMYYYY(new Date(sunday.fields.Date));
          const scriptureInfo = scripturePortions.scripturePortions[
            activeYear
          ]?.find((item) => item.date === dateStr);

          if (scriptureInfo) {
            if (scriptureInfo.scriptures.length >= 2) {
              newFields[
                "Scripture Passage"
              ] = `${scriptureInfo.scriptures[0].passage}, ${scriptureInfo.scriptures[1].passage}`;
              newFields[
                "MV"
              ] = `${scriptureInfo.scriptures[0].mv}, ${scriptureInfo.scriptures[1].mv}`;
            } else if (scriptureInfo.scriptures.length === 1) {
              newFields["Scripture Passage"] =
                scriptureInfo.scriptures[0].passage;
              newFields["MV"] = scriptureInfo.scriptures[0].mv;
            }

            const messageThemeObj = scriptureInfo.scriptures.find(
              (s) => s.messageTheme
            );
            if (messageThemeObj) {
              newFields["Message Theme"] = messageThemeObj.messageTheme;
            }
          }

          // Set Message field to empty
          newFields["Message"] = "";

          // Process role assignments
          headings.slice(1).forEach((heading) => {
            // Skip non-role fields that are already filled
            if (
              ["Scripture Passage", "MV", "Message Theme", "Message"].includes(
                heading
              )
            ) {
              return;
            }

            const requiredCount = heading === "Scripture Reading" ? 2 : 1;
            const eligibleCandidates = getEligibleCandidates(
              heading,
              isFirstSundayOfMonth
            );

            if (eligibleCandidates.length === 0) {
              console.warn(`⚠️ No eligible candidates for ${heading}`);
              if (heading === "Scripture Reading") {
                newFields[heading] = ["TBD", "TBD"];
              } else {
                newFields[heading] = "TBD";
              }
              return;
            }

            console.log(`🎯 Assigning ${heading} (need ${requiredCount})`);

            const selectedNames = [];

            // Get prioritized candidates
            const prioritizedCandidates = getWeightedRandomSelection(
              eligibleCandidates,
              currentPosition,
              monthUsedNames,
              monthIndex,
              sundayIndex,
              heading
            );

            // First, try to fill with people not used in this month
            const availableInMonth = prioritizedCandidates.filter(
              (person) => !monthUsedNames.has(person.name.toLowerCase())
            );

            let assignedCount = 0;

            // Assign from people not used in this month
            for (
              let i = 0;
              i < availableInMonth.length && assignedCount < requiredCount;
              i++
            ) {
              const selectedPerson = availableInMonth[i];
              const properName = toProperCase(selectedPerson.name);
              const lowerName = selectedPerson.name.toLowerCase();

              selectedNames.push(properName);
              monthUsedNames.add(lowerName);

              // Track month assignments
              if (!monthAssignments.has(lowerName)) {
                monthAssignments.set(lowerName, []);
              }
              monthAssignments.get(lowerName).push(currentPosition);

              // Update global tracking
              globalPersonRoleCounts[lowerName] =
                (globalPersonRoleCounts[lowerName] || 0) + 1;
              globalPersonLastAssigned[lowerName] = currentPosition;

              // Track role assignment
              if (!globalRoleAssignments[lowerName]) {
                globalRoleAssignments[lowerName] = [];
              }
              globalRoleAssignments[lowerName].push(
                `${heading} (M${monthIndex + 1}S${sundayIndex + 1})`
              );

              assignedCount++;
              console.log(
                `✅ Assigned ${properName} to ${heading} (new to month)`
              );
            }

            // If we still need more people, use people already used in this month
            while (assignedCount < requiredCount) {
              const fallbackPerson = selectFromUsedNames(
                eligibleCandidates,
                monthUsedNames,
                currentPosition
              );

              if (fallbackPerson) {
                const properName = toProperCase(fallbackPerson.name);
                const lowerName = fallbackPerson.name.toLowerCase();

                selectedNames.push(properName);

                // Track month assignments
                if (!monthAssignments.has(lowerName)) {
                  monthAssignments.set(lowerName, []);
                }
                monthAssignments.get(lowerName).push(currentPosition);

                // Update global tracking
                globalPersonRoleCounts[lowerName] =
                  (globalPersonRoleCounts[lowerName] || 0) + 1;
                globalPersonLastAssigned[lowerName] = currentPosition;

                // Track role assignment
                if (!globalRoleAssignments[lowerName]) {
                  globalRoleAssignments[lowerName] = [];
                }
                globalRoleAssignments[lowerName].push(
                  `${heading} (M${monthIndex + 1}S${sundayIndex + 1})`
                );

                assignedCount++;
                console.log(
                  `🔄 Assigned ${properName} to ${heading} (repeat in month)`
                );
              } else {
                // Last resort: pick anyone available
                const anyAvailable = shuffleArray(eligibleCandidates);
                if (anyAvailable.length > 0) {
                  const selectedPerson = anyAvailable[0];
                  const properName = toProperCase(selectedPerson.name);
                  const lowerName = selectedPerson.name.toLowerCase();

                  selectedNames.push(properName);
                  monthUsedNames.add(lowerName);

                  // Track month assignments
                  if (!monthAssignments.has(lowerName)) {
                    monthAssignments.set(lowerName, []);
                  }
                  monthAssignments.get(lowerName).push(currentPosition);

                  // Update global tracking
                  globalPersonRoleCounts[lowerName] =
                    (globalPersonRoleCounts[lowerName] || 0) + 1;
                  globalPersonLastAssigned[lowerName] = currentPosition;

                  // Track role assignment
                  if (!globalRoleAssignments[lowerName]) {
                    globalRoleAssignments[lowerName] = [];
                  }
                  globalRoleAssignments[lowerName].push(
                    `${heading} (M${monthIndex + 1}S${sundayIndex + 1})`
                  );

                  assignedCount++;
                  console.log(
                    `🎲 Assigned ${properName} to ${heading} (random selection)`
                  );
                } else {
                  // Truly no one available - use TBD
                  selectedNames.push("TBD");
                  assignedCount++;
                  console.warn(
                    `❌ Had to use TBD for ${heading} - no candidates available`
                  );
                }
              }
            }

            // Assign the selected names
            if (heading === "Scripture Reading") {
              newFields[heading] = selectedNames.slice(0, 2);
            } else {
              newFields[heading] = selectedNames[0];
            }

            console.log(
              `📋 Final assignment for ${heading}:`,
              newFields[heading]
            );
          });

          return {
            ...sunday,
            fields: newFields,
            originalFields: { ...newFields },
          };
        });

        console.log(
          `✅ Month ${monthIndex + 1} completed. Total assignments:`,
          monthAssignments.size
        );

        // Log month summary
        monthAssignments.forEach((positions, name) => {
          if (positions.length > 1) {
            console.log(
              `📊 ${toProperCase(name)}: ${
                positions.length
              } assignments in month ${monthIndex + 1}`
            );
          }
        });

        return { ...monthBlock, sundays };
      });

      // Log final statistics
      console.log("\n📊 FINAL STATISTICS:");
      console.log("Role assignments per person:");
      Object.entries(globalPersonRoleCounts)
        .sort(([, a], [, b]) => b - a)
        .forEach(([name, count]) => {
          if (count > 0) {
            const assignments = globalRoleAssignments[name] || [];
            console.log(
              `  ${toProperCase(name)}: ${count} role(s) - ${assignments.join(
                ", "
              )}`
            );
          }
        });

      const peopleWithRoles = Object.values(globalPersonRoleCounts).filter(
        (count) => count > 0
      ).length;
      const totalPeople = allAvailableNames.size;
      const totalAssignments = Object.values(globalPersonRoleCounts).reduce(
        (sum, count) => sum + count,
        0
      );
      console.log(
        `\n🎯 Coverage: ${peopleWithRoles}/${totalPeople} people assigned roles`
      );
      console.log(`📈 Total assignments: ${totalAssignments}`);

      // Count TBD assignments
      const tbdCount = JSON.stringify(updated).split('"TBD"').length - 1;
      console.log(`⚠️ TBD assignments: ${tbdCount}`);

      // Warn about people who didn't get any roles
      const peopleWithoutRoles = Object.entries(globalPersonRoleCounts)
        .filter(([name, count]) => count === 0)
        .map(([name]) => toProperCase(name));

      if (peopleWithoutRoles.length > 0) {
        console.warn("⚠️ People who didn't get any roles:", peopleWithoutRoles);
      }

      // Check for people with multiple assignments
      const multipleAssignments = Object.entries(globalRoleAssignments)
        .filter(([name, assignments]) => assignments.length > 1)
        .map(
          ([name, assignments]) =>
            `${toProperCase(name)}: ${assignments.length} assignments`
        );

      if (multipleAssignments.length > 0) {
        console.log(
          "\n📋 People with multiple assignments:",
          multipleAssignments
        );
      }

      setMonthData(updated);
      setResetKey((prev) => prev + 1);

      // Show success message with statistics
      let message = `Auto-generation completed!\n\n✅ ${peopleWithRoles} out of ${totalPeople} people assigned roles\n📈 Total assignments: ${totalAssignments}`;

      if (tbdCount > 0) {
        message += `\n⚠️ ${tbdCount} positions marked as "TBD" - please assign manually`;
      } else {
        message += `\n🎉 All positions filled with real names!`;
      }

      if (peopleWithoutRoles.length > 0) {
        message += `\n⚠️ ${
          peopleWithoutRoles.length
        } people didn't get roles: ${peopleWithoutRoles
          .slice(0, 5)
          .join(", ")}${peopleWithoutRoles.length > 5 ? "..." : ""}`;
      } else {
        message += "\n🎉 All available people got at least one role!";
      }

      if (multipleAssignments.length > 0) {
        message += `\n📋 ${multipleAssignments.length} people have multiple assignments`;
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
          📋 Assign Roles for Upcoming Sundays
        </h2>
        <div className="flex gap-5 flex-wrap items-start">
          <div className="text-center">
            <p className="font-medium mb-1">Year</p>
            <select
              value={activeYear}
              onChange={(e) => setActiveYear(e.target.value)}
              className="border px-2 py-1 rounded text-sm"
            >
              {allowedYears.map((year) => (
                <option key={year} value={year}>
                  {year}
                </option>
              ))}
            </select>
          </div>
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
                <ChromePicker
                  color={bgColor}
                  onChange={(c) => setBgColor(c.hex)}
                  disableAlpha
                />
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
                <ChromePicker
                  color={textColor}
                  onChange={(c) => setTextColor(c.hex)}
                  disableAlpha
                />
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
            style={{ marginLeft: "8px", width: "60px", textAlign: "center", border: "1px solid #DDDDDD" }}
          />
        </label>
      </div>
      {monthData.length === 3 &&
        [0, 1, 2].map((i) => (
          <MonthSection
            key={`${activeYear}-${i}-${resetKey}`}
            monthIndex={i}
            bgColor={bgColor}
            textColor={textColor}
            registerData={registerData}
            initialData={monthData[i]}
            activeYear={parseInt(activeYear)}
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

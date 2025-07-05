// ✅ Updated firebaseHelper.js
import { db } from "../firebaseConfig";
import { doc, setDoc, getDoc } from "firebase/firestore";

export async function saveSundayRoles(data) {
  try {
    await setDoc(doc(db, "roles", `sundayRoles_${data.activeYear}`), {
      monthData: data.monthData,
      bgColor: data.bgColor,
      textColor: data.textColor,
      activeYear: data.activeYear,
      savedAt: new Date().toISOString(),
    });
    alert("✅ Data saved successfully to Firebase!");
  } catch (error) {
    console.error("❌ Error saving roles:", error);
    alert("Error saving data. See console for details.");
  }
}

export async function getSundayRoles(year) {
  try {
    const docSnap = await getDoc(doc(db, "roles", `sundayRoles_${year}`));
    if (docSnap.exists()) {
      const data = docSnap.data();
      return {
        monthData: data.monthData || [],
        bgColor: data.bgColor || "#0a2942",
        textColor: data.textColor || "#ffffff",
        activeYear: data.activeYear || new Date().getFullYear().toString(),
      };
    } else {
      return null;
    }
  } catch (error) {
    console.error("❌ Error fetching saved roles:", error);
    return null;
  }
}

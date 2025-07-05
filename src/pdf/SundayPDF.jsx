// src/pdf/SundayPDF.jsx
import React from "react";
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Font,
} from "@react-pdf/renderer";
import { headings } from "../constants";

// Styles
const styles = StyleSheet.create({
  page: {
    padding: 20,
    fontFamily: "Helvetica",
    fontSize: 9,
  },
  monthBlock: {
    marginBottom: 20,
  },
  header: {
    backgroundColor: "#0a2942",
    color: "#ffffff",
    paddingVertical: 6,
    textAlign: "center",
    fontSize: 12,
    marginBottom: 4,
  },
  table: {
    display: "table",
    width: "auto",
    borderStyle: "solid",
    borderWidth: 1,
    borderRightWidth: 0,
    borderBottomWidth: 0,
  },
  row: {
    flexDirection: "row",
  },
  cell: {
    borderStyle: "solid",
    borderWidth: 1,
    borderLeftWidth: 0,
    borderTopWidth: 0,
    padding: 4,
    textAlign: "center",
    flexGrow: 1,
  },
  mergedCell: {
    padding: 4,
    borderStyle: "solid",
    borderWidth: 1,
    borderLeftWidth: 0,
    borderTopWidth: 0,
    textAlign: "left",
    flexGrow: headings.length - 1,
  },
});

export const SundayPDF = ({ data, bgColor, textColor }) => (
  <Document>
    <Page size="A4" orientation="landscape" style={styles.page}>
      {data.map(({ sundays, selectedMonth }) =>
        sundays.length === 0 ? null : (
          <View key={selectedMonth} style={styles.monthBlock}>
            <Text
              style={[
                styles.header,
                { backgroundColor: bgColor, color: textColor },
              ]}
            >
              Order of Sunday – {selectedMonth}
            </Text>

            <View style={styles.table}>
              {/* Table Header */}
              <View style={styles.row}>
                {headings.map((h, i) => (
                  <Text key={i} style={styles.cell}>
                    {h}
                  </Text>
                ))}
              </View>

              {/* Data Rows */}
              {sundays.map((sunday, idx) => (
                <View key={idx} style={styles.row}>
                  <Text style={styles.cell}>{sunday.fields["Date"] || ""}</Text>

                  {sunday.isMerged ? (
                    <Text style={styles.mergedCell}>
                      {sunday.fields["MergedContent"] || ""}
                    </Text>
                  ) : (
                    headings.slice(1).map((field, i) => (
                      <Text key={i} style={styles.cell}>
                        {sunday.fields[field] || ""}
                      </Text>
                    ))
                  )}
                </View>
              ))}
            </View>
          </View>
        )
      )}
    </Page>
  </Document>
);

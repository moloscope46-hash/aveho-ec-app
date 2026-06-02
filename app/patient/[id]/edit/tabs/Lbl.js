"use client";
// app/patient/[id]/edit/tabs/Lbl.js — extrait depuis page.js en 0.57.1

import React, { useState, useEffect } from "react";
// 0.57.10 : imports retirés (Panel, Btn non utilisés)

// 0.57.10 : imports retirés (logger non utilisés)

function Lbl({ children }) {
  return <div style={{ fontSize: 10.5, color: "#6c7a89", textTransform: "uppercase", letterSpacing: 0.4, fontWeight: 700, marginBottom: 4 }}>{children}</div>;
}

export default Lbl;

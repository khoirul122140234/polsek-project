// src/pages/admin/PengajuanSurat.jsx
import React, { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { getUser } from "../../lib/auth";

// Pecahan halaman
import SuratIzinKeramaian from "./SuratIzinKeramaian";
import SuratTandaKehilangan from "./SuratTandaKehilangan";

export default function PengajuanSurat() {
  const location = useLocation();
  const navigate = useNavigate();

  const [user, setUser] = useState(() => getUser());

  useEffect(() => {
    const onStorage = (e) => {
      if (e.key === "user") setUser(getUser());
      if (e.key === "token" && !e.newValue) setUser(null);
    };
    window.addEventListener("storage", onStorage);
    setUser(getUser());
    return () => window.removeEventListener("storage", onStorage);
  }, [location.pathname, location.search]);

  const role = user?.role || "";

  // mapping akses tab per role
  const allowedTabs = useMemo(() => {
    if (role === "ADMIN_INTELKAM") return ["izin"];
    if (role === "ADMIN_SPKT") return ["kehilangan"];
    if (role === "SUPER_ADMIN") return ["izin", "kehilangan"];
    return [];
  }, [role]);

  const getTabFromSearch = (search) => {
    const t = new URLSearchParams(search || "").get("tab");
    return t === "kehilangan" ? "kehilangan" : "izin";
  };

  const [tab, setTab] = useState(() => getTabFromSearch(window.location.search));

  // ✅ Sinkron tab <-> URL + guard role vs tab
  useEffect(() => {
    if (!user) return;

    if (allowedTabs.length === 0) {
      navigate("/admin/dashboard", { replace: true });
      return;
    }

    const sp = new URLSearchParams(location.search || "");
    const requestedTab = getTabFromSearch(location.search);

    let finalTab = requestedTab;
    if (!allowedTabs.includes(finalTab)) finalTab = allowedTabs[0];

    setTab((prev) => (prev === finalTab ? prev : finalTab));

    const currentTabParam = sp.get("tab");
    if (currentTabParam !== finalTab) {
      sp.set("tab", finalTab);
      navigate({ pathname: location.pathname, search: `?${sp.toString()}` }, { replace: true });
    }
  }, [location.pathname, location.search, navigate, allowedTabs, user]);

  const setTabAndSyncUrl = (nextTab) => {
    const t = nextTab === "kehilangan" ? "kehilangan" : "izin";
    if (!allowedTabs.includes(t)) return;

    const sp = new URLSearchParams(location.search || "");
    sp.set("tab", t);
    navigate({ pathname: location.pathname, search: `?${sp.toString()}` });
  };

  // Render halaman sesuai tab
  if (tab === "kehilangan") {
    return (
      <SuratTandaKehilangan
        user={user}
        setTabAndSyncUrl={setTabAndSyncUrl}
        allowedTabs={allowedTabs}
        tab={tab}
      />
    );
  }

  return (
    <SuratIzinKeramaian
      user={user}
      setTabAndSyncUrl={setTabAndSyncUrl}
      allowedTabs={allowedTabs}
      tab={tab}
    />
  );
}
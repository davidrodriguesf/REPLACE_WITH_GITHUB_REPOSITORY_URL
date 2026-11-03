type P = { className?: string };
const base = "w-5 h-5";
const svg = (d: string) =>
  function Icon({ className = base }: P) {
    return (
      <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8} aria-hidden>
        <path strokeLinecap="round" strokeLinejoin="round" d={d} />
      </svg>
    );
  };

export const IconBook = svg("M12 6.25v13m0-13C10.8 5.4 9.25 5 7.5 5 5.75 5 4.2 5.4 3 6.25v13C4.2 18.4 5.75 18 7.5 18s3.3.4 4.5 1.25m0-13C13.2 5.4 14.75 5 16.5 5c1.75 0 3.3.4 4.5 1.25v13C19.8 18.4 18.25 18 16.5 18c-1.75 0-3.3.4-4.5 1.25");
export const IconUsers = svg("M17 20h5v-2a3 3 0 0 0-5.36-1.86M17 20H7m10 0v-2c0-.66-.13-1.28-.36-1.86M7 20H2v-2a3 3 0 0 1 5.36-1.86M7 20v-2c0-.66.13-1.28.36-1.86m0 0a5 5 0 0 1 9.28 0M15 7a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z");
export const IconCalendar = svg("M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2Z");
export const IconUser = svg("M16 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0ZM12 14a7 7 0 0 0-7 7h14a7 7 0 0 0-7-7Z");
export const IconShield = svg("M9 12l2 2 4-4m5.6-4.02A11.96 11.96 0 0 1 12 2.94a11.96 11.96 0 0 1-8.6 3.04A12 12 0 0 0 3 9c0 5.6 3.82 10.3 9 11.62 5.18-1.33 9-6.03 9-11.62 0-1.04-.13-2.05-.38-3.02Z");
export const IconLock = svg("M12 15v2m-6 4h12a2 2 0 0 0 2-2v-6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2Zm10-10V7a4 4 0 0 0-8 0v4h8Z");
export const IconCheck = svg("M5 13l4 4L19 7");
export const IconPlay = svg("M14.75 11.17l-4.2-2.8A1 1 0 0 0 9 9.2v5.6a1 1 0 0 0 1.55.83l4.2-2.8a1 1 0 0 0 0-1.66ZM21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z");
export const IconHeart = svg("M4.32 6.32a4.5 4.5 0 0 0 0 6.36L12 20.36l7.68-7.68a4.5 4.5 0 0 0-6.36-6.36L12 7.64l-1.32-1.32a4.5 4.5 0 0 0-6.36 0Z");
export const IconChat = svg("M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.42-4.03 8-9 8a9.86 9.86 0 0 1-4.26-.95L3 20l1.4-3.72C3.51 15.04 3 13.57 3 12c0-4.42 4.03-8 9-8s9 3.58 9 8Z");
export const IconPin = svg("M5 5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16l-7-3.5L5 21V5Z");
export const IconGift = svg("M12 8v13m0-13V6a2 2 0 1 1 2 2h-2Zm0 0V5.5A2.5 2.5 0 1 0 9.5 8H12Zm-7 4h14M5 12a2 2 0 1 1 0-4h14a2 2 0 1 1 0 4M5 12v7a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-7");
export const IconLogout = svg("M17 16l4-4m0 0-4-4m4 4H7m6 4v1a3 3 0 0 1-3 3H6a3 3 0 0 1-3-3V7a3 3 0 0 1 3-3h4a3 3 0 0 1 3 3v1");
export const IconHome = svg("M3 12l2-2m0 0 7-7 7 7M5 10v10a1 1 0 0 0 1 1h3m10-11 2 2m-2-2v10a1 1 0 0 1-1 1h-3m-6 0a1 1 0 0 0 1-1v-4a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v4a1 1 0 0 0 1 1m-6 0h6");
export const IconDownload = svg("M4 16v1a3 3 0 0 0 3 3h10a3 3 0 0 0 3-3v-1m-4-4-4 4m0 0-4-4m4 4V4");
export const IconInfo = svg("M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z");
export const IconClock = svg("M12 8v4l3 3m6-3a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z");
export const IconMenu = svg("M4 7h16M4 12h16M4 17h16");
export const IconSearch = svg("m21 21-4.35-4.35M17 10.5a6.5 6.5 0 1 1-13 0 6.5 6.5 0 0 1 13 0Z");
export const IconX = svg("M6 18 18 6M6 6l12 12");
export const IconChevronRight = svg("m9 5 7 7-7 7");
export const IconChevronDown = svg("m19 9-7 7-7-7");
export const IconChevronLeft = svg("m15 19-7-7 7-7");
export const IconAward = svg("M12 15a6 6 0 1 0 0-12 6 6 0 0 0 0 12Zm-3.5-1.2L7 21l5-3 5 3-1.5-7.2");
export const IconTarget = svg("M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Zm0-4a5 5 0 1 0 0-10 5 5 0 0 0 0 10Zm0-4a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z");
export const IconRoute = svg("M6 19a2 2 0 1 0 0-4 2 2 0 0 0 0 4Zm12-10a2 2 0 1 0 0-4 2 2 0 0 0 0 4ZM6 15V9a4 4 0 0 1 4-4h6M18 9v6a4 4 0 0 1-4 4H8");
export const IconLibrary = svg("M4 19V5m4 14V5m4 14V7l4-2 4 14");
export const IconCatalog = svg("M4 5h4v14H4zM10 5h4v14h-4zM16.5 5.5l3.5 1-3.5 13-3.5-1z");
export const IconClipboard = svg("M9 4h6a1 1 0 0 1 1 1v1H8V5a1 1 0 0 1 1-1Zm-3 2h12a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1Z");
export const IconHourglass = svg("M7 3h10M7 21h10M8 3v3a4 4 0 0 0 8 0V3M8 21v-3a4 4 0 0 1 8 0v3");
export const IconEdit = svg("M15.2 5.2l3.6 3.6M4 20l4.5-1 10-10a2.5 2.5 0 0 0-3.5-3.5l-10 10L4 20Z");
export const IconBriefcase = svg("M9 6V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v1m-11 0h16a1 1 0 0 1 1 1v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7a1 1 0 0 1 1-1Zm-1 6h18");
export const IconHelp = svg("M9.1 9a3 3 0 0 1 5.8 1c0 2-3 3-3 3m.1 4h.01M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z");
export const IconQuiz = svg("M9 11l2 2 4-4M5 4h14a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1Z");
export const IconBookmark = svg("M6 4h12v17l-6-4-6 4V4Z");
export const IconDots = svg("M5 12h.01M12 12h.01M19 12h.01");
export const IconChart = svg("M4 20V10m6 10V4m6 16v-7m4 7H2");

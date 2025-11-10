import React from 'react';

const iconProps = {
  className: "w-5 h-5",
  strokeWidth: "1.5",
  stroke: "currentColor",
  fill: "none",
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

export const TopicIcon: React.FC = () => (
    <svg {...iconProps} className="w-4 h-4 mr-2"><path stroke="none" d="M0 0h24v24H0z" fill="none"/><path d="M16 6h3a1 1 0 0 1 1 1v11a2 2 0 0 1 -4 0v-11a1 1 0 0 1 1 -1z" /><path d="M12 6h-3a1 1 0 0 0 -1 1v11a2 2 0 0 0 4 0v-11a1 1 0 0 0 -1 -1z" /><path d="M8 6h-3a1 1 0 0 0 -1 1v11a2 2 0 0 0 4 0v-11a1 1 0 0 0 -1 -1z" /></svg>
);

export const ViewAllIcon: React.FC = () => (
    <svg {...iconProps} className="w-5 h-5 mr-2"><path stroke="none" d="M0 0h24v24H0z" fill="none"/><path d="M17 7l-10 10" /><path d="M8 7l9 0l0 9" /></svg>
);

export const ShowLessIcon: React.FC = () => (
    <svg {...iconProps} className="w-5 h-5 mr-2"><path stroke="none" d="M0 0h24v24H0z" fill="none"/><path d="M6 15l6 -6l6 6" /></svg>
);

export const SummaryIcon: React.FC = () => (
    <svg {...iconProps} className="w-5 h-5"><path stroke="none" d="M0 0h24v24H0z" fill="none"/><path d="M3 4m0 1a1 1 0 0 1 1 -1h16a1 1 0 0 1 1 1v1a1 1 0 0 1 -1 1h-16a1 1 0 0 1 -1 -1z" /><path d="M5 8h14" /><path d="M5 12h14" /><path d="M5 16h14" /></svg>
);

export const SentimentIcon: React.FC = () => (
    <svg {...iconProps} className="w-5 h-5"><path stroke="none" d="M0 0h24v24H0z" fill="none"/><path d="M20.985 11.008a9 9 0 1 0 -8.985 10.002" /><path d="M9 10h.01" /><path d="M15 10h.01" /><path d="M9.5 15.25a3.5 3.5 0 0 1 5 0" /></svg>
);

export const EntityIcon: React.FC = () => (
    <svg {...iconProps} className="w-5 h-5"><path stroke="none" d="M0 0h24v24H0z" fill="none"/><path d="M3 7v10a1 1 0 0 0 1 1h16a1 1 0 0 0 1 -1v-10a1 1 0 0 0 -1 -1h-16a1 1 0 0 0 -1 1z" /><path d="M12 4l-1.414 -1.414a2 2 0 0 1 2.828 0l-1.414 1.414z" /><path d="M10 14h4" /></svg>
);

export const PerspectiveIcon: React.FC = () => (
    <svg {...iconProps}><path stroke="none" d="M0 0h24v24H0z" fill="none"/><path d="M12 12m-9 0a9 9 0 1 0 18 0a9 9 0 1 0 -18 0" /><path d="M12 3v18" /><path d="M3.6 9h16.8" /><path d="M3.6 15h16.8" /><path d="M12 12m-3 0a3 3 0 1 0 6 0a3 3 0 1 0 -6 0" /></svg>
);

export const PollIcon: React.FC = () => (
    <svg {...iconProps}><path stroke="none" d="M0 0h24v24H0z" fill="none"/><path d="M9 5h10a1 1 0 0 1 1 1v12a1 1 0 0 1 -1 1h-10a1 1 0 0 1 -1 -1v-12a1 1 0 0 1 1 -1" /><path d="M5 5h-1a1 1 0 0 0 -1 1v12a1 1 0 0 0 1 1h1" /><path d="M12 12m-3 0a3 3 0 1 0 6 0a3 3 0 1 0 -6 0" /><path d="M12 16.5l0 1.5" /><path d="M12 7.5l0 -1.5" /><path d="M15 12l1.5 0" /><path d="M7.5 12l-1.5 0" /></svg>
);

export const ScenarioIcon: React.FC = () => (
    <svg {...iconProps}><path stroke="none" d="M0 0h24v24H0z" fill="none"/><path d="M12 12m-9 0a9 9 0 1 0 18 0a9 9 0 1 0 -18 0" /><path d="M9 14.25a3.5 3.5 0 0 1 6 0" /><path d="M9 10h.01" /><path d="M15 10h.01" /><path d="M12 12l2 -2.8" /><path d="M10 12l2 2.8" /></svg>
);

export const DriversIcon: React.FC = () => (
    <svg {...iconProps}><path stroke="none" d="M0 0h24v24H0z" fill="none"/><path d="M6 12m-1 0a1 1 0 1 0 2 0a1 1 0 1 0 -2 0" /><path d="M12 12m-1 0a1 1 0 1 0 2 0a1 1 0 1 0 -2 0" /><path d="M18 12m-1 0a1 1 0 1 0 2 0a1 1 0 1 0 -2 0" /></svg>
);

export const DataPointIcon: React.FC = () => (
    <svg {...iconProps} className="w-4 h-4 text-slate-500 flex-shrink-0"><path stroke="none" d="M0 0h24v24H0z" fill="none"/><path d="M9 12v-4" /><path d="M12 12v-1" /><path d="M15 12v-2" /><path d="M12 12v-1a4 4 0 0 0 -4 -4" /><path d="M12 12v3a2 2 0 0 0 2 2" /><path d="M12 12v-2a2 2 0 0 1 2 -2" /><path d="M3 12a9 9 0 1 0 18 0a9 9 0 1 0 -18 0" /></svg>
);

export const ReadIcon: React.FC = () => (
    <svg {...iconProps} className="w-8 h-8 text-[#64FFDA] mb-2"><path stroke="none" d="M0 0h24v24H0z" fill="none"/><path d="M12 6l-8 4l8 4l8 -4l-8 -4" /><path d="M4 14l8 4l8 -4" /></svg>
);

export const ViewedIcon: React.FC = () => (
    <svg {...iconProps} className="w-8 h-8 text-[#64FFDA] mb-2"><path stroke="none" d="M0 0h24v24H0z" fill="none"/><path d="M10 12a2 2 0 1 0 4 0a2 2 0 0 0 -4 0" /><path d="M21 12c-2.4 4 -5.4 6 -9 6c-3.6 0 -6.6 -2 -9 -6c2.4 -4 5.4 -6 9 -6c3.6 0 6.6 2 9 6" /></svg>
);

export const FollowedIcon: React.FC = () => (
    <svg {...iconProps} className="w-8 h-8 text-[#64FFDA] mb-2"><path stroke="none" d="M0 0h24v24H0z" fill="none"/><path d="M8.56 3.69a9 9 0 0 1 11.75 4.35" /><path d="M3.69 8.56a9 9 0 0 1 4.35 -4.86" /><path d="M3.69 15.44a9 9 0 0 1 .13 -2.02" /><path d="M8.56 20.31a9 9 0 0 1 -2.02 -.13" /><path d="M15.44 20.31a9 9 0 0 1 -4.86 -4.35" /><path d="M20.31 15.44a9 9 0 0 1 -4.35 4.86" /><path d="M20.31 8.56a9 9 0 0 1 -.13 2.02" /><path d="M15.44 3.69a9 9 0 0 1 2.02 .13" /><path d="M12 12m-3 0a3 3 0 1 0 6 0a3 3 0 1 0 -6 0" /></svg>
);

export const AccountIcon: React.FC = () => (
    <svg {...iconProps}><path stroke="none" d="M0 0h24v24H0z" fill="none"/><path d="M12 12m-9 0a9 9 0 1 0 18 0a9 9 0 1 0 -18 0" /><path d="M12 10m-3 0a3 3 0 1 0 6 0a3 3 0 1 0 -6 0" /><path d="M6.168 18.849a4 4 0 0 1 3.832 -2.849h4a4 4 0 0 1 3.834 2.855" /></svg>
);

export const NotificationIcon: React.FC = () => (
    <svg {...iconProps}><path stroke="none" d="M0 0h24v24H0z" fill="none"/><path d="M10 5a2 2 0 1 1 4 0a7 7 0 0 1 4 6v3a4 4 0 0 0 2 3h-16a4 4 0 0 0 2 -3v-3a7 7 0 0 1 4 -6" /><path d="M9 17v1a3 3 0 0 0 6 0v-1" /></svg>
);

export const AppearanceIcon: React.FC = () => (
    <svg {...iconProps}><path stroke="none" d="M0 0h24v24H0z" fill="none"/><path d="M12 3a9 9 0 1 0 9 9" /><path d="M12 3a9 9 0 0 1 9 9" /><path d="M12 3v18" /></svg>
);

export const ContentIcon: React.FC = () => (
    <svg {...iconProps}><path stroke="none" d="M0 0h24v24H0z" fill="none"/><path d="M16 6h3a1 1 0 0 1 1 1v11a2 2 0 0 1 -4 0v-11a1 1 0 0 1 1 -1z" /><path d="M12 6h-3a1 1 0 0 0 -1 1v11a2 2 0 0 0 4 0v-11a1 1 0 0 0 -1 -1z" /><path d="M8 6h-3a1 1 0 0 0 -1 1v11a2 2 0 0 0 4 0v-11a1 1 0 0 0 -1 -1z" /></svg>
);

export const AccessibilityIcon: React.FC = () => (
    <svg {...iconProps}><path stroke="none" d="M0 0h24v24H0z" fill="none"/><path d="M12 12m-9 0a9 9 0 1 0 18 0a9 9 0 1 0 -18 0" /><path d="M12 12m-2 0a2 2 0 1 0 4 0a2 2 0 1 0 -4 0" /><path d="M10 16.5l2 -3l2 3m-2 -3v-2" /><path d="M10 7.5l2 3l2 -3m-2 3v2" /></svg>
);

export const PrivacyIcon: React.FC = () => (
    <svg {...iconProps}><path stroke="none" d="M0 0h24v24H0z" fill="none"/><path d="M12 12m-9 0a9 9 0 1 0 18 0a9 9 0 1 0 -18 0" /><path d="M12 12m-1 0a1 1 0 1 0 2 0a1 1 0 1 0 -2 0" /><path d="M12 14l0 4.5" /></svg>
);

export const InfoIcon: React.FC = () => (
    <svg {...iconProps}><path stroke="none" d="M0 0h24v24H0z" fill="none"/><path d="M12 12m-9 0a9 9 0 1 0 18 0a9 9 0 1 0 -18 0" /><path d="M12 9h.01" /><path d="M11 12h1v4h1" /></svg>
);
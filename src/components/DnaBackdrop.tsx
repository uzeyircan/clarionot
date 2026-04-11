type DnaBackdropProps = {
  className?: string;
};

export default function DnaBackdrop({ className = "" }: DnaBackdropProps) {
  return (
    <div
      aria-hidden="true"
      className={`pointer-events-none absolute inset-0 overflow-hidden ${className}`}
    >
      <div className="absolute left-1/2 top-1/2 h-[760px] w-[1120px] -translate-x-1/2 -translate-y-1/2 opacity-45 blur-[0.2px]">
        <svg
          className="h-full w-full"
          viewBox="0 0 1120 760"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            <linearGradient
              id="dnaLine"
              x1="120"
              y1="0"
              x2="1000"
              y2="760"
              gradientUnits="userSpaceOnUse"
            >
              <stop stopColor="#6bfb9a" stopOpacity="0" />
              <stop offset="0.28" stopColor="#6bfb9a" stopOpacity="0.46" />
              <stop offset="0.68" stopColor="#44e2cd" stopOpacity="0.34" />
              <stop offset="1" stopColor="#44e2cd" stopOpacity="0" />
            </linearGradient>
            <linearGradient
              id="dnaRung"
              x1="0"
              y1="0"
              x2="1"
              y2="0"
              gradientUnits="objectBoundingBox"
            >
              <stop stopColor="#6bfb9a" stopOpacity="0.02" />
              <stop offset="0.5" stopColor="#6bfb9a" stopOpacity="0.2" />
              <stop offset="1" stopColor="#44e2cd" stopOpacity="0.02" />
            </linearGradient>
          </defs>

          <path
            d="M80 102C238 34 358 186 520 148C676 112 724 10 1040 92"
            stroke="url(#dnaLine)"
            strokeWidth="1.4"
          />
          <path
            d="M80 658C238 726 358 574 520 612C676 648 724 750 1040 668"
            stroke="url(#dnaLine)"
            strokeWidth="1.4"
          />
          <path
            d="M140 220C270 128 390 284 560 246C720 210 820 130 1010 212"
            stroke="url(#dnaLine)"
            strokeWidth="1"
            opacity="0.72"
          />
          <path
            d="M140 540C270 632 390 476 560 514C720 550 820 630 1010 548"
            stroke="url(#dnaLine)"
            strokeWidth="1"
            opacity="0.72"
          />

          {[
            [155, 138, 190, 620],
            [224, 122, 256, 636],
            [292, 128, 326, 628],
            [360, 150, 398, 608],
            [428, 154, 468, 604],
            [496, 146, 536, 614],
            [564, 132, 606, 628],
            [632, 112, 676, 648],
            [700, 92, 744, 668],
            [768, 76, 812, 684],
            [836, 72, 882, 688],
            [904, 78, 952, 682],
          ].map(([x1, y1, x2, y2], index) => (
            <g key={`${x1}-${y1}`}>
              <path
                d={`M${x1} ${y1}L${x2} ${y2}`}
                stroke="url(#dnaRung)"
                strokeWidth="1"
              />
              <circle
                cx={x1}
                cy={y1}
                r={index % 3 === 0 ? 3.5 : 2.4}
                fill="#6bfb9a"
                fillOpacity={index % 2 === 0 ? 0.24 : 0.12}
              />
              <circle
                cx={x2}
                cy={y2}
                r={index % 3 === 0 ? 3.5 : 2.4}
                fill="#44e2cd"
                fillOpacity={index % 2 === 0 ? 0.18 : 0.1}
              />
            </g>
          ))}
        </svg>
      </div>
    </div>
  );
}

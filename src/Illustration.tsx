export function Illustration({
  kind = "garden",
  className = "",
}: {
  kind?: string;
  className?: string;
}) {
  const palette: Record<string, string[]> = {
    garden: ["#e6ebcd", "#5b7860", "#b4c388"],
    art: ["#f4dacb", "#bb6e53", "#e5a067"],
    walk: ["#dce9e8", "#648b91", "#b6c8a0"],
    hall: ["#e7decf", "#a78365", "#d4b295"],
    family: ["#f0e6c1", "#be9363", "#b6bc87"],
    support: ["#dce4f0", "#7786ab", "#b6c6b4"],
  };
  const [bg, ink, accent] = palette[kind] || palette.garden;
  return (
    <svg
      className={className}
      viewBox="0 0 600 390"
      role="img"
      aria-label={`Community ${kind} illustration`}
      xmlns="http://www.w3.org/2000/svg"
    >
      <rect width="600" height="390" fill={bg} />
      <circle cx="470" cy="82" r="43" fill="#faf3da" />
      <path d="M0 290 Q180 190 310 278 T600 240 V390 H0" fill={accent} />
      <path d="M0 335 Q230 270 600 330 V390 H0" fill={ink} opacity=".18" />
      {kind === "hall" ? (
        <>
          <path
            d="M110 180L300 65 495 180"
            stroke={ink}
            strokeWidth="20"
            strokeLinejoin="round"
            fill="none"
          />
          <rect
            x="135"
            y="180"
            width="335"
            height="155"
            rx="4"
            fill="#faf2e3"
          />
          <rect x="271" y="230" width="68" height="105" fill={ink} />
          {[165, 370].map((x) => (
            <g key={x}>
              <rect x={x} y="215" width="68" height="65" fill={accent} />
              <path
                d={`M${x + 34} 215v65M${x} 247h68`}
                stroke="#faf2e3"
                strokeWidth="5"
              />
            </g>
          ))}
          <path d="M269 335l-49 55h175l-57-55" fill="#f8efdd" />
        </>
      ) : kind === "art" ? (
        <>
          <path
            d="M200 340l80-270h38l87 270M235 240h134"
            fill="none"
            stroke={ink}
            strokeWidth="17"
          />
          <rect
            x="181"
            y="94"
            width="235"
            height="170"
            rx="3"
            fill="#fff6e9"
            transform="rotate(-5 300 180)"
          />
          <circle cx="265" cy="165" r="38" fill={ink} />
          <path
            d="M320 115q-60 130 50 110"
            fill="none"
            stroke={accent}
            strokeWidth="25"
          />
          <path
            d="M225 230l50-50 36 43"
            fill="none"
            stroke="#759077"
            strokeWidth="18"
          />
        </>
      ) : (
        <>
          <path
            d="M70 300v-134m0 75l-36-35m36 8l34-30"
            stroke={ink}
            strokeWidth="12"
            strokeLinecap="round"
          />
          <ellipse cx="68" cy="142" rx="51" ry="63" fill={ink} />
          {kind === "garden" ? (
            <>
              <rect
                x="200"
                y="266"
                width="230"
                height="63"
                rx="5"
                fill="#ae7358"
              />
              <path
                d="M200 288h230M200 308h230"
                stroke="#d99f79"
                strokeWidth="3"
              />
              {[230, 285, 340, 395].map((x, i) => (
                <g key={x}>
                  <path d={`M${x} 270v-60`} stroke={ink} strokeWidth="7" />
                  <ellipse
                    cx={x - 12}
                    cy={223 + i * 3}
                    rx="17"
                    ry="9"
                    fill={ink}
                    transform={`rotate(35 ${x - 12} ${223 + i * 3})`}
                  />
                  <ellipse
                    cx={x + 12}
                    cy="240"
                    rx="17"
                    ry="9"
                    fill={ink}
                    transform={`rotate(-35 ${x + 12} 240)`}
                  />
                </g>
              ))}
            </>
          ) : (
            <path d="M185 390q70-130 200-140l85 140" fill="#f8efdc" />
          )}
          <g
            transform={kind === "family" ? "translate(40 5)" : "translate(0 0)"}
          >
            <circle cx="440" cy="191" r="20" fill="#a86e50" />
            <path
              d="M423 211q-13 30-5 66h50q8-37-13-66"
              fill={kind === "walk" ? "#b16e50" : ink}
            />
            <path
              d="M428 277l-12 58m40-58l15 58"
              stroke="#354c43"
              strokeWidth="12"
              strokeLinecap="round"
            />
            <path
              d="M421 226l-32 36m69-35l27 28"
              stroke="#a86e50"
              strokeWidth="10"
              strokeLinecap="round"
            />
          </g>
          {kind === "family" && (
            <g>
              <circle cx="349" cy="240" r="15" fill="#c38f6d" />
              <path d="M338 256l-8 39h37l-8-39" fill="#b87154" />
              <path
                d="M340 295l-6 38m22-38l8 38"
                stroke={ink}
                strokeWidth="9"
                strokeLinecap="round"
              />
            </g>
          )}
        </>
      )}
      <path
        d="M29 367h46m445-16h32M113 347h22"
        stroke={ink}
        strokeWidth="3"
        strokeLinecap="round"
        opacity=".5"
      />
    </svg>
  );
}
export function Neighbourhood() {
  return (
    <svg
      viewBox="0 0 650 510"
      role="img"
      aria-label="An illustrated neighbourhood with homes, trees and people connecting"
    >
      <rect width="650" height="510" rx="180" fill="#e3e8d4" />
      <circle cx="487" cy="103" r="46" fill="#f6d38b" />
      <path d="M0 340Q150 180 350 310T650 280V510H0" fill="#c4d0aa" />
      <path d="M100 510q135-220 350-230l60 56q-180 15-227 174" fill="#f9f1de" />
      <g stroke="#8b9b77" strokeWidth="3" fill="none">
        <path d="M550 380V120m0 120l-40-40m40 6l37-35M76 357V145m0 92l-30-30" />
      </g>
      <ellipse cx="550" cy="143" rx="55" ry="91" fill="#719178" />
      <ellipse cx="76" cy="175" rx="46" ry="65" fill="#91a17c" />
      <g>
        <rect x="127" y="213" width="150" height="128" fill="#f7e8cc" />
        <path d="M110 217l92-85 93 85" fill="#bd755b" />
        <rect x="183" y="273" width="37" height="68" fill="#57786a" />
        <rect x="143" y="242" width="27" height="33" fill="#e6b874" />
        <rect x="232" y="242" width="27" height="33" fill="#e6b874" />
      </g>
      <g>
        <rect x="344" y="184" width="127" height="110" fill="#faf3e2" />
        <path d="M326 188l81-72 81 72" fill="#69867b" />
        <rect x="392" y="235" width="31" height="59" fill="#bd755b" />
        <rect x="356" y="213" width="25" height="29" fill="#d4bd86" />
        <rect x="436" y="213" width="25" height="29" fill="#d4bd86" />
      </g>
      <g>
        <circle cx="308" cy="337" r="15" fill="#b47f5a" />
        <path d="M291 355h33l10 58h-54z" fill="#d08d60" />
        <path
          d="M293 413l-8 47m34-47l9 47"
          stroke="#385949"
          strokeWidth="11"
          strokeLinecap="round"
        />
        <path
          d="M292 365l-28 24m57-24l25 15"
          stroke="#b47f5a"
          strokeWidth="10"
          strokeLinecap="round"
        />
        <circle cx="374" cy="326" r="16" fill="#8c6149" />
        <path d="M358 343h33l9 60h-50z" fill="#4f7767" />
        <path
          d="M361 403l-9 49m34-49l10 49"
          stroke="#385949"
          strokeWidth="11"
          strokeLinecap="round"
        />
        <path
          d="M359 354l-17 26m47-25l21 24"
          stroke="#8c6149"
          strokeWidth="10"
          strokeLinecap="round"
        />
      </g>
      <g fill="#f5eee0">
        <circle cx="113" cy="414" r="5" />
        <circle cx="505" cy="420" r="6" />
        <circle cx="486" cy="436" r="4" />
      </g>
      <path d="M0 468q80-110 185 42M450 510q85-104 200-45" fill="#6c8b70" />
      <g fill="#c27a59">
        <circle cx="69" cy="451" r="6" />
        <circle cx="545" cy="486" r="7" />
      </g>
    </svg>
  );
}

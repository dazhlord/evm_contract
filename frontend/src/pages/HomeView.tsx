import { Link } from "react-router-dom";
import PROGRAM_ID from "../config/addresses.json";

const HomeView = () => {
  const paths = [
    { label: "create chainlink oracle", path: "/create/oracle/chainlink" },
    { label: "view chainlink pool adapter", path: "/view/oracle/chainlink/0x" + PROGRAM_ID.chainlinkAdapter },
    { label: "create digital payoff", path: "/create/payoff/digital" },
    { label: "view digital option pool", path: "/view/payoff/digital/0x" + PROGRAM_ID.digitalPayoffPool },
    { label: "create trade", path: "/create/trade" },
    { label: "view trade", path: "/view/trade/" + PROGRAM_ID.tradePool + "/0" },
  ];

  return (
    <div>
      <ul>
        {paths.map((p) => (
          <li>
            <Link to={p.path}>{p.label}</Link>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default HomeView;

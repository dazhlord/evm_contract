import { Link } from "react-router-dom";
import { useSelectedChain } from "../hooks/useSelectedChain";

const HomeView = () => {
  const chainMetadata = useSelectedChain();

  const paths = [
    { label: "create chainlink oracle", path: "/create/oracle/chainlink" },
    {
      label: "view chainlink pool adapter",
      path: "/view/oracle/chainlink/0x" + chainMetadata?.programs.chainlinkAdapter,
    },
    { label: "create digital payoff", path: "/create/payoff/digital" },
    {
      label: "view digital option pool",
      path: "/view/payoff/digital/0x" + chainMetadata?.programs.digitalPayoffPool,
    },
    { label: "create trade", path: "/create/trade" },
    { label: "view trade", path: "/view/trade/" + chainMetadata?.programs.tradePool + "/0" },
  ];

  return (
    <div>
      <ul>
        {paths.map((p) => (
          <li key={p.path}>
            <Link to={p.path}>{p.label}</Link>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default HomeView;

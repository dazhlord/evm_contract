import { Link } from "react-router-dom";

const HomeView = () => {
  const paths = [
    { label: "create chainlink oracle", path: "/create/oracle/chainlink" },
    { label: "create digital payoff", path: "/create/payoff/digital" },
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

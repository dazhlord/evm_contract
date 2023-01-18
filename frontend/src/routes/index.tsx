import { Routes, Route } from "react-router-dom";
import HomeView from "../pages/HomeView";
import CreateDigitalPayoff from "../pages/CreateDigitalPayoff";
import ViewDigitalPayoff from "../pages/ViewDigitalPayoff";
import CreateChainlinkOracle from "../pages/CreateChainlinkOracle";
import ViewChainlinkOracle from "../pages/ViewChainlinkOracle";

const RouteMain = () => {
  return (
    <Routes>
      <Route path="/" element={<HomeView />} />

      <Route path="/create/oracle/chainlink" element={<CreateChainlinkOracle />} />
      <Route path="/view/oracle/chainlink/:addr" element={<ViewChainlinkOracle />} />

      <Route path="/create/payoff/digital" element={<CreateDigitalPayoff />} />
      <Route path="/view/payoff/digital/:addr" element={<ViewDigitalPayoff />} />
    </Routes>
  );
};

export default RouteMain;

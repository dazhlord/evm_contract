import { Routes, Route } from "react-router-dom";
import HomeView from "../pages/HomeView";
import CreateDigitalPayoff from "../pages/digital-option/create";
import ViewChainlinkOracle from "../pages/chainlink-oracle/view";
import CreateChainlinkOracle from "../pages/chainlink-oracle/create";
import ViewDigitalOption from "../pages/digital-option/view";
import CreateTrade from "../pages/trade/create";
import ViewTrade from "../pages/trade/view";

const RouteMain = () => {
  return (
    <Routes>
      <Route path="/" element={<HomeView />} />

      <Route path="/create/oracle/chainlink" element={<CreateChainlinkOracle />} />
      <Route path="/view/oracle/chainlink/:addr" element={<ViewChainlinkOracle />} />

      <Route path="/create/payoff/digital" element={<CreateDigitalPayoff />} />
      <Route path="/view/payoff/digital/:addr" element={<ViewDigitalOption />} />

      <Route path="/create/trade" element={<CreateTrade />} />
      <Route path="/view/trade/:addr/:id" element={<ViewTrade />} />
    </Routes>
  );
};

export default RouteMain;

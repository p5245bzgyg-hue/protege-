import { Routes, Route } from "react-router-dom";
import Home from "@/pages/Home";
import Shared from "@/pages/Shared";

// One <Route> per page in src/pages; BrowserRouter already wraps this in main.tsx.
export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/s/:id" element={<Shared />} />
      <Route path="*" element={<Home />} />
    </Routes>
  );
}

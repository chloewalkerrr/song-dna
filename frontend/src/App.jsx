import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import AppLayout from "@/components/AppLayout";
import { LibraryProvider } from "@/components/library-provider";
import { SelectionProvider } from "@/components/selection-provider";
import { ThemeProvider } from "@/components/theme-provider";
import HomePage from "@/pages/HomePage";
import LibraryPage from "@/pages/LibraryPage";
import ComparePage from "@/pages/ComparePage";

function App() {
  return (
    <ThemeProvider>
      <LibraryProvider>
        <SelectionProvider>
          <BrowserRouter>
            <Routes>
              <Route element={<AppLayout />}>
                <Route index element={<HomePage />} />
                <Route path="library" element={<LibraryPage />} />
                <Route path="compare" element={<ComparePage />} />
                <Route path="*" element={<Navigate to="/" replace />} />
              </Route>
            </Routes>
          </BrowserRouter>
        </SelectionProvider>
      </LibraryProvider>
    </ThemeProvider>
  );
}

export default App;

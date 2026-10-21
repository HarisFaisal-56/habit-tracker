import { EmptyState } from "../../components/EmptyState";
import { Screen } from "../../components/Screen";

export function SettingsScreen() {
  return (
    <Screen title="Settings">
      <EmptyState>Theme, backup and data options will appear here.</EmptyState>
    </Screen>
  );
}

import { EmptyState } from "../../components/EmptyState";
import { Screen } from "../../components/Screen";

export function ReviewScreen() {
  return (
    <Screen title="Weekly review">
      <EmptyState>Reflect on your week here every Sunday.</EmptyState>
    </Screen>
  );
}

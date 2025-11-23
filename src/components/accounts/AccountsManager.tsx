import React, { useState } from "react";
import AccountsList from "./AccountsList";
import AccountForm from "./AccountForm";
import AccountsWithBalanceList from "./AccountsWithBalanceList";

export default function AccountsManager() {
  const [refresh, setRefresh] = useState(0);
  return (
    <div className="space-y-4">
      <h2 className="text-lg font-bold">Minhas Contas</h2>
      <AccountForm onAccountCreated={() => setRefresh(r => r + 1)} />
      <AccountsWithBalanceList key={refresh} />
    </div>
  );
}

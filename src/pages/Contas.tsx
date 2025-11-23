import React from "react";
import AccountsManager from "@/components/accounts/AccountsManager";
import { Wallet } from "lucide-react";

export default function Contas() {
  return (
    <div className="max-w-xl mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4 flex items-center gap-2">
        <span>Gerenciar Contas e Cartões</span>
        <span className="text-blue-500"><Wallet className="inline w-6 h-6" /></span>
      </h1>
      <AccountsManager />
    </div>
  );
}

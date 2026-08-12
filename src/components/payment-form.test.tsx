import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { PaymentForm } from "./payment-form";

const mocks = vi.hoisted(() => ({
  push: vi.fn(),
  refresh: vi.fn(),
  record: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mocks.push, refresh: mocks.refresh }),
}));

vi.mock("@/app/payment-actions", () => ({
  recordPaymentAction: mocks.record,
}));

const positions = [
  { registrationId: "11111111-1111-4111-8111-111111111111", pilgrimId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa", tripId: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb", pilgrimName: "Mario Rossi", tripName: "Lourdes", agreed: 500, paid: 200, remaining: 300, status: "Parziale" as const, nextDueOn: null },
  { registrationId: "22222222-2222-4222-8222-222222222222", pilgrimId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa", tripId: "cccccccc-cccc-4ccc-8ccc-cccccccccccc", pilgrimName: "Mario Rossi", tripName: "Fatima", agreed: 400, paid: 350, remaining: 50, status: "Parziale" as const, nextDueOn: null },
];

describe("PaymentForm contextual payment flow", () => {
  beforeEach(() => vi.clearAllMocks());

  it("prefills the selected registration, its full balance and the return link", () => {
    render(<PaymentForm positions={positions} defaultRegistrationId={positions[0].registrationId} returnTo="/pellegrini/pilgrim-id" />);

    expect(screen.getByRole("combobox", { name: "Iscrizione *" })).toHaveValue(positions[0].registrationId);
    expect(screen.getByRole("spinbutton", { name: /Importo/ })).toHaveValue(300);
    expect(screen.getByRole("link", { name: "Torna indietro" })).toHaveAttribute("href", "/pellegrini/pilgrim-id");
  });

  it("updates the proposed balance when another trip is selected", () => {
    render(<PaymentForm positions={positions} defaultRegistrationId={positions[0].registrationId} />);

    fireEvent.change(screen.getByRole("combobox", { name: "Iscrizione *" }), { target: { value: positions[1].registrationId } });

    expect(screen.getByRole("spinbutton", { name: /Importo/ })).toHaveValue(50);
  });
});

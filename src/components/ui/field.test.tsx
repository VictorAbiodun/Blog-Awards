import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { Field, PasswordField } from "./field";

describe("Field", () => {
  it("links the label to the input", () => {
    render(<Field label="Email" />);
    expect(screen.getByLabelText("Email")).toBeInTheDocument();
  });

  it("announces an error and marks the input invalid", () => {
    render(<Field label="Email" error="Enter a valid email address." />);
    expect(screen.getByRole("alert")).toHaveTextContent("Enter a valid email address.");
    expect(screen.getByLabelText("Email")).toHaveAttribute("aria-invalid", "true");
  });
});

describe("PasswordField", () => {
  it("hides the password until the person chooses to show it", () => {
    render(<PasswordField label="Password" />);
    expect(screen.getByLabelText("Password")).toHaveAttribute("type", "password");
    fireEvent.click(screen.getByRole("button", { name: "Show" }));
    expect(screen.getByLabelText("Password")).toHaveAttribute("type", "text");
  });
});

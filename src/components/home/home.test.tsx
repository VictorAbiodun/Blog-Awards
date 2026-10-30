import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { Hero } from "./Hero";
import { HowItWorks } from "./HowItWorks";

describe("Hero", () => {
  it("shows the headline and a working link to how voting works", () => {
    render(<Hero />);
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(/vote the\s+next big one/i);
    expect(screen.getByRole("link", { name: /see how voting works/i })).toHaveAttribute("href", "#how-it-works");
  });

  it("labels the price as a sample, not a final price", () => {
    render(<Hero />);
    expect(screen.getByText(/sample price/i)).toBeInTheDocument();
  });
});

describe("HowItWorks", () => {
  it("lists the four steps in order", () => {
    render(<HowItWorks />);
    const steps = screen.getAllByRole("listitem");
    expect(steps).toHaveLength(4);
    expect(steps[0]).toHaveTextContent(/make an account/i);
    expect(steps[3]).toHaveTextContent(/winners get published/i);
  });

  it("has the anchor id the hero link points at", () => {
    const { container } = render(<HowItWorks />);
    expect(container.querySelector("#how-it-works")).not.toBeNull();
  });
});

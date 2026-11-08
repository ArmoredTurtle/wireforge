import { getDefinition } from "@/domain/connectors";
import { terminalEndpoint, rebuildNets, type HarnessProject, type Wire } from "@/domain/model";
import { createDemoProject } from "@/domain/project";

/** An editable example that deliberately needs several readable A4 sheets. */
export function createComplexDemoProject(): HarnessProject {
  const definitions = [
    ["main", "MAIN", "micro-fit-3-0-8"],
    ["power", "POWER", "micro-fit-3-0-8"],
    ["motor-a", "MOTOR A", "micro-fit-3-0-4"],
    ["motor-b", "MOTOR B", "micro-fit-3-0-4"],
    ["tool", "TOOL", "jst-xh-6"],
    ["aux", "AUX", "jst-xh-6"],
    ["sensor", "SENSOR", "jst-ph-6"],
    ["service", "SERVICE", "jst-xh-6"],
  ];
  const connectors: HarnessProject["connectors"] = definitions.map(([id, reference, definitionId], index) => ({
    id, reference, definitionId, view: index % 3 === 2 ? "wire-entry" : "mating", x: 90 + index * 100, y: 160,
  }));
  const terminals = connectors.flatMap((c) => Array.from({ length: getDefinition(c.definitionId)!.pinCount }, (_, i) => ({
    id: `${c.id}-p${i + 1}`, connectorId: c.id, pin: i + 1, label: "",
  })));
  type Route = [string, number, string | undefined, number, string, number, number];
  const routes: Route[] = [
    ["power", 1, "main", 1, "24V CONTROL SUPPLY", 600, 22],
    ["power", 2, "main", 2, "CONTROL GROUND", 600, 22],
    ["power", 1, "tool", 1, "24V TOOL BRANCH", 450, 24],
    ["power", 2, "tool", 2, "TOOL GROUND BRANCH", 450, 24],
    ["power", 1, "aux", 1, "24V AUXILIARY BRANCH", 750, 24],
    ["power", 2, "aux", 2, "AUXILIARY GROUND BRANCH", 750, 24],
    ["main", 3, "motor-a", 1, "MOTOR A PHASE A+", 800, 22],
    ["main", 4, "motor-a", 2, "MOTOR A PHASE A-", 800, 22],
    ["main", 5, "motor-a", 3, "MOTOR A PHASE B+", 800, 22],
    ["main", 6, "motor-a", 4, "MOTOR A PHASE B-", 800, 22],
    ["power", 3, "motor-b", 1, "MOTOR B PHASE A+", 1100, 22],
    ["power", 4, "motor-b", 2, "MOTOR B PHASE A-", 1100, 22],
    ["power", 5, "motor-b", 3, "MOTOR B PHASE B+", 1100, 22],
    ["power", 6, "motor-b", 4, "MOTOR B PHASE B-", 1100, 22],
    ["main", 7, "tool", 3, "TOOL PWM CONTROL", 450, 24],
    ["main", 8, "tool", 4, "TOOL TACHOMETER RETURN", 450, 24],
    ["aux", 3, "tool", 5, "TOOL DATA", 500, 24],
    ["aux", 4, "tool", 6, "TOOL CLOCK", 500, 24],
    ["sensor", 1, "main", 2, "SENSOR GROUND RETURN", 900, 24],
    ["sensor", 2, "power", 7, "SENSOR SUPPLY", 900, 24],
    ["sensor", 3, "aux", 5, "CHAMBER TEMPERATURE SENSOR SIGNAL", 900, 24],
    ["sensor", 4, "aux", 6, "CHAMBER TEMPERATURE SENSOR RETURN", 900, 24],
    ["service", 1, "main", 7, "SERVICE DIAGNOSTIC TRANSMIT", 1200, 24],
    ["service", 2, "main", 8, "SERVICE DIAGNOSTIC RECEIVE", 1200, 24],
    ["service", 3, "service", 4, "SERVICE INTERLOCK JUMPER", 150, 24],
    ["service", 5, "service", 5, "DIAGNOSTIC LOOP", 100, 24],
    ["sensor", 5, undefined, 0, "SPARE SENSOR INPUT", 250, 24],
    ["service", 6, undefined, 0, "SPARE SERVICE RETURN", 300, 24],
  ];
  const colors = ["#dc2626", "#18181b", "#2563eb", "#16a34a", "#eab308", "#9333ea"];
  const wires: Wire[] = routes.map(([from, pin, to, targetPin, label, lengthMm, awg], index) => ({
    id: `wire-machine-${index + 1}`, source: terminalEndpoint(from, pin),
    destination: to ? terminalEndpoint(to, targetPin) : undefined,
    label, lengthMm, awg, color: colors[index % colors.length],
    stripeColor: index % 5 === 2 ? "#ffffff" : undefined,
    notes: to ? "Example machine harness route" : "Intentional spare end in example harness",
  }));
  return { ...createDemoProject(), id: "project-complex-demo", name: "Complex Machine Example Harness",
    connectors, terminals, wires, nets: rebuildNets(wires) };
}

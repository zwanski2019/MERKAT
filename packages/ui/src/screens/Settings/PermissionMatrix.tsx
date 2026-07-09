/**
 * Team → permission matrix (CLAUDE.md §8). Read-only in Phase 2: shows which
 * role may perform each action, grouped by area. Per-tenant overrides + editing
 * land with the Team management flow in a later phase. The client hides UI a
 * role can't use; the API enforces the same matrix independently.
 */
import { ACTIONS, ROLES, can } from "@merkat/core";

export function PermissionMatrix(): JSX.Element {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[520px] border-collapse text-sm">
        <thead>
          <tr>
            <th className="border-b border-border p-3 text-left font-medium text-muted">
              Action
            </th>
            {ROLES.map((role) => (
              <th
                key={role}
                className="border-b border-border p-3 text-center font-medium capitalize text-fg"
              >
                {role}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {ACTIONS.map(({ action, area, label }) => (
            <tr key={action}>
              <td className="border-b border-border p-3 text-fg">
                <span className="text-muted">{area}</span> · {label}
              </td>
              {ROLES.map((role) => (
                <td
                  key={role}
                  className="border-b border-border p-3 text-center"
                >
                  {can(role, action) ? (
                    <span className="text-accent" aria-label="allowed">
                      ●
                    </span>
                  ) : (
                    <span className="text-border" aria-label="denied">
                      ○
                    </span>
                  )}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

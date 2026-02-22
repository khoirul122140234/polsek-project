// src/components/ui/Table.jsx
import React from "react";

export function Table({ columns = [], data = [] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-gray-100 text-left">
            {columns.map((c) => (
              <th key={c.key} className="px-3 py-2 font-semibold">{c.header}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.length === 0 ? (
            <tr>
              <td className="px-3 py-6 text-center text-gray-500" colSpan={columns.length}>
                Tidak ada data
              </td>
            </tr>
          ) : (
            data.map((row, i) => (
              <tr key={i} className="border-t">
                {columns.map((c) => (
                  <td key={c.key} className="px-3 py-2">
                    {c.render ? c.render(row) : row[c.key]}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

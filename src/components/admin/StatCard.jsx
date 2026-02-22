import { Card, CardBody } from "../ui/Card";

export default function StatCard({ label, value, hint }) {
  return (
    <Card className="w-full">
      <CardBody className="p-4 sm:p-5 md:p-6">
        <div className="text-xs sm:text-sm text-gray-500 break-words">
          {label}
        </div>

        <div className="mt-1 text-2xl sm:text-3xl md:text-4xl font-extrabold leading-tight break-words">
          {value}
        </div>

        {hint ? (
          <div className="mt-2 text-[11px] sm:text-xs text-gray-400 leading-snug break-words">
            {hint}
          </div>
        ) : null}
      </CardBody>
    </Card>
  );
}

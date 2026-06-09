import { Card } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const HALL_OF_FAME_DATA = [
  { name: "Tomek", medals: "🥇🥇🥈🥈" },
  { name: "Bartek", medals: "🥇🥈🥈🥉" },
  { name: "Damian", medals: "🥇🥈🥉" },
  { name: "Ala", medals: "🥇" },
  { name: "Ela", medals: "🥇" },
  { name: "Magda", medals: "🥇🥉" },
  { name: "Dominika", medals: "🥈🥉🥉" },
  { name: "Angelika", medals: "🥈" },
  { name: "Geniu", medals: "🥈" },
  { name: "Albert", medals: "🥉" },
  { name: "Gosia", medals: "🥉" },
  { name: "Julka", medals: "🥉" },
  { name: "Kasia", medals: "🥉" },
  { name: "Rysiu", medals: "🥉" },
];

const HALL_OF_SHAME_DATA = [
  { name: "Ela", burgers: "🍔🍔🍔" },
  { name: "Jola P.", burgers: "🍔" },
  { name: "Kasia", burgers: "🍔" },
  { name: "Krzysztof", burgers: "🍔" },
  { name: "Rysiu", burgers: "🍔" },
];

interface HallOfFameTableProps {
  hallOfFameTitle: string;
  hallOfShameTitle: string;
  nameHeader: string;
  medalsHeader: string;
  heroHeader: string;
}

export function HallOfFameTable({
  hallOfFameTitle,
  hallOfShameTitle,
  nameHeader,
  medalsHeader,
  heroHeader,
}: HallOfFameTableProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 w-full">
      <section className="space-y-3">
        <h3 className="text-lg sm:text-xl font-bold text-[#0a192f]">
          {hallOfFameTitle}
        </h3>
        <Card className="w-full rounded-2xl border-slate-100 p-0 shadow-[0_2px_10px_-3px_rgba(6,81,237,0.1)]">
          <div className="overflow-x-auto public-table-scroll">
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50/50 border-b border-slate-100 text-xs uppercase tracking-wider text-slate-500 font-semibold">
                  <TableHead className="p-4 h-auto">{nameHeader}</TableHead>
                  <TableHead className="p-4 h-auto">{medalsHeader}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {HALL_OF_FAME_DATA.map((entry) => (
                  <TableRow key={entry.name} className="hover:bg-slate-50">
                    <TableCell className="p-4 font-medium text-slate-700 whitespace-nowrap">
                      {entry.name}
                    </TableCell>
                    <TableCell className="p-4 whitespace-nowrap">
                      {entry.medals}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </Card>
      </section>

      <section className="space-y-3">
        <h3 className="text-lg sm:text-xl font-bold text-[#0a192f]">
          {hallOfShameTitle}
        </h3>
        <Card className="w-full rounded-2xl border-slate-100 p-0 shadow-[0_2px_10px_-3px_rgba(6,81,237,0.1)]">
          <div className="overflow-x-auto public-table-scroll">
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50/50 border-b border-slate-100 text-xs uppercase tracking-wider text-slate-500 font-semibold">
                  <TableHead className="p-4 h-auto">{heroHeader}</TableHead>
                  <TableHead className="p-4 h-auto" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {HALL_OF_SHAME_DATA.map((entry) => (
                  <TableRow key={entry.name} className="hover:bg-slate-50">
                    <TableCell className="p-4 font-medium text-slate-700 whitespace-nowrap">
                      {entry.name}
                    </TableCell>
                    <TableCell className="p-4 whitespace-nowrap">
                      {entry.burgers}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </Card>
      </section>
    </div>
  );
}

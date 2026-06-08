import { generateObject } from "ai";
import { openai } from "@ai-sdk/openai";
import { z } from "zod";

const predictionSchema = z.object({
  participantName: z
    .string()
    .nullable()
    .describe("Imię wpisane na górze formularza"),
  scores: z.array(
    z.object({
      matchId: z
        .string()
        .or(z.number())
        .describe("ID meczu przekazane w kontekście"),
      homeScore: z
        .number()
        .nullable()
        .describe(
          "Wynik gospodarza. Zwróć null jeśli pole jest całkowicie puste.",
        ),
      awayScore: z
        .number()
        .nullable()
        .describe("Wynik gościa. Zwróć null jeśli pole jest całkowicie puste."),
    }),
  ),
});

export async function extractPredictionsWithAI(
  imageBase64: string,
  matchesContext: Array<{
    id: string | number;
    homeTeam: string;
    awayTeam: string;
  }>,
  modelName: string,
) {
  const result = await generateObject({
    model: openai(modelName),
    schema: predictionSchema,
    system:
      "Jesteś ekspertem analizującym zdjęcia wypełnionych formularzy typowania meczów. Na obrazku znajduje się tabela z meczami. Użytkownik ręcznie wpisał wyniki (cyfry). Zignoruj absolutnie wszelkie śmieci, losowe ciągi znaków, ucięte wyrazy i przebijający tekst z drugiej strony kartki. Skup się wyłącznie na liczbach wpisanych przy nazwach państw. Uważaj na typowe błędy pism odręcznych (np. 'A', 'l', 'I' to często jedynka, 'O', 'o' to zero). Znaki typu '-', '--', '---', ':' to tylko separatory między wynikiem gospodarza a gościa. Jeśli widnieje np. '- 2', wywnioskuj, że wpisano tylko wynik gościa, a wynik gospodarza to null. Twoim zadaniem jest przypisać odczytane wyniki do meczów z dostarczonej listy kontekstowej.",
    messages: [
      {
        role: "user",
        content: [
          {
            type: "text",
            text: `Dopasuj wyniki do tej listy meczów (JSON): ${JSON.stringify(matchesContext)}`,
          },
          {
            type: "image",
            image: `data:image/jpeg;base64,${imageBase64}`,
          },
        ],
      },
    ],
  });

  return result.object;
}

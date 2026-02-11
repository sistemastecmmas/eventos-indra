import * as soap from 'soap';

export async function enviarEventosSicov(url: string, cadena: string): Promise<any> {
  const client = await soap.createClientAsync(url);
  const result = await client.EnviarEventosSicovAsync({ cadena });
  return result[0].EnviarEventosSicovResult;
}

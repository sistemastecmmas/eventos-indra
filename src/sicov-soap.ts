import * as soap from 'soap';

export async function enviarEventosSicov(url: string, cadena: string, location?: string): Promise<any> {
  const client = await soap.createClientAsync(url);
  if (location) client.setEndpoint(location);
  const result = await client.EnviarEventosSicovAsync({ cadena });
  return result[0].EnviarEventosSicovResult;
}

export async function enviarFurSicov(url: string, cadena: string, location?: string): Promise<any> {
  const client = await soap.createClientAsync(url);
  if (location) client.setEndpoint(location);
  client.addHttpHeader('X-Service-Version', '19');
  const result = await client.EnviarFurSicovAsync({ cadena });
  return result[0].EnviarFurSicovResult;
}
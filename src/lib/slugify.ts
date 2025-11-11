//  Funcio q crea el slug de la empresa automaticamente

export function slugify(input: string) {
  return input
    .toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "") // quita acentos
    .replace(/[^a-z0-9]+/g, "-")                      // separa por guiones
    .replace(/^-+|-+$/g, "")                          // limpia extremos
    .slice(0, 48);                                    // límite razonable
}

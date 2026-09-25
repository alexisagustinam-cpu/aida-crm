export function assertStageBelongsToPipeline(dealPipelineId: string, stagePipelineId: string) {
  if (dealPipelineId !== stagePipelineId) throw new Error('La etapa no pertenece al pipeline de la oportunidad.')
}

                              )}
                              <span>{config.buttonText || 'Apply Now'}</span>
                            </div>
                          </div>
                        </div>

                        <div className="rounded-xl border border-[#3c3426] bg-[#111319] p-4">
                          <h4 className="mb-3 text-sm font-bold">
                            Publishing Destination
                          </h4>

                          <div className="space-y-3 text-xs">
                            <div className="flex items-center justify-between gap-3">
                              <span className="text-[#a4a5ad]">
                                Application Channel
                              </span>
                              <span className="max-w-[55%] truncate text-right text-[#e8c37d]">
                                {channels.find(c => c.id === config.applyChannel)?.name
                                  ? `#${channels.find(c => c.id === config.applyChannel)?.name}`
                                  : 'Not configured'}
                              </span>
                            </div>

                            <div className="flex items-center justify-between gap-3">
                              <span className="text-[#a4a5ad]">
                                Review Channel
                              </span>
                              <span className="max-w-[55%] truncate text-right text-[#e8c37d]">
                                {channels.find(c => c.id === config.reviewChannel)?.name
                                  ? `#${channels.find(c => c.id === config.reviewChannel)?.name}`
                                  : 'Not configured'}
                              </span>
                            </div>

                            <div className="flex items-center justify-between gap-3">
                              <span className="text-[#a4a5ad]">
                                Questions
                              </span>
                              <span className="text-white">
                                {config.questions.length}/10
                              </span>
                            </div>
                          </div>
                        </div>

                        {dirty && (
                          <div className="flex items-center gap-2 rounded-lg border border-[#69502a] bg-[#d6a84f]/10 px-3 py-3 text-xs text-[#eac47d]">
                            <AlertCircle size={15} />
                            You have unsaved changes.
                          </div>
                        )}

                        <button
                          onClick={() => void publishPanel()}
                          disabled={publishing || busy || !loaded || selectedId !== 'legacy'}
                          className={`${goldButton} w-full`}
                        >
                          {publishing ? (
                            <Loader2 size={17} className="animate-spin" />
                          ) : (
                            <Send size={17} />
                          )}
                          {publishing
                            ? 'Publishing...'
                            : selectedId !== 'legacy' ? 'Publish Requires Multi-Form API' : 'Publish Application Panel'}
                        </button>

                        <div className="flex gap-2">
                          <button
                            onClick={() => void save()}
                            disabled={busy || publishing}
                            className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-[#65502e] px-3 py-3 text-xs font-bold text-[#e6c27d] disabled:opacity-40"
                          >
                            <Save size={15} />
                            Save Design
                          </button>

                          <button
                            onClick={() => {
                              change('panelColor', '#D9AC55')
                              change('buttonColor', 'success')
                              change('buttonText', 'Apply Now')
                              change('buttonEmoji', '📝')
                            }}
                            className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-[#393a40] px-3 py-3 text-xs font-bold text-[#bfc0c6]"
                          >
                            <RotateCcw size={15} />
                            Reset Style
                          </button>
                        </div>

                        <p className="text-center text-[11px] leading-5 text-[#92949d]">
                          Publishing requires the application publish API
                          and KataBump bot integration.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </motion.div>
          </AnimatePresence>

          <footer className="mt-8 flex flex-wrap items-center justify-between gap-3 border-t border-[#342e25] pt-5 text-[11px] text-[#8d919b]">
            <span>CYBER ORGANIZATION V10 · APPLICATION STUDIO</span>

            <span className="flex items-center gap-2">
              <Settings2 size={13} />
              {loaded ? 'Configuration loaded' : 'Loading...'}
              {dirty && ' · Unsaved changes'}
              {selectedId !== 'legacy' && ' · Browser-only draft'}
            </span>
          </footer>
        </main>
      </div>
    </div>
  )
}

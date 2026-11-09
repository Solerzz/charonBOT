-- API roles receive no policies; the existing backend owner retains access.
ALTER TABLE public."VoiceCreator" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."TemporaryRoom" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."_prisma_migrations" ENABLE ROW LEVEL SECURITY;

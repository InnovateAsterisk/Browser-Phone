#######################################
# Asterisk & Browser Phone Dockerfile #
#######################################
# The easiest way to kick the tires on WebRTC.

# Note: Make sure you have Docker installed and running

# 1️⃣ Step 1) Build this docker 
# ===========================
# Show the terminal (if you are in Visual Studio Code) and issue the following command:
#  docker build --tag browser-phone:latest .
# (Don't forget to include that little fullstop at the end)
# Note: Last time I ran this it took about 15minutes... go take the dog for a walk!

# 2️⃣ Step 2) Run this docker
# =========================
# In the same terminal, run the following command:
#  docker run -t -i -p 5060:5060/udp -p 8089:8089/tcp browser-phone:latest
# It can take a moment, but this will not be long

# 3️⃣ Step 3) Navigate to https://localhost:8089/
# =============================================
# Note: You will probably have Chrome or Edge security warning page up in front of you right now.
# This is because the script makes a self-signed localhost certificate and installs it.
# It's fine for testing, so just click the "Advanced" button on that page, and click
# "Proceed to localhost (unsafe)". (Trust me, this is perfectly safe.)
# Your browser phone is up and running... see easy as 1... 2... 3...

# 👩🏼‍🦰 Add a User
# =============
# I have pre-loaded some users in the config. You will have User1, User2 and User3 all ready for you.
# The Browser Phone may be promoting you for account details, They will be as follows:
# Secure WebSocket Server (TLS): localhost
# WebSocket Port: 8089
# WebSocket Path: /ws
# Full Name: User One    (or anything you like)
# Domain: localhost
# SIP Username: User1    (or User2 or User3)
# SIP Password: 1234
# Subscribe to VoiceMail (MWI): off
# Chat Engine: SIP

# That should be fine for you to create an account, so click Save, and let the page reload.
# You should see the status go to "Registered" at the top.

# Once registered, make a test call to music on hold with the number *65
# Hmmm... good ol elevator music 

# 🎉 Congratulations!! 

# ========================================

# Don't change this:
FROM debian:bookworm

# This is the release version from Asterisk, to change the version, refer to Asterisk GitHub site, and set accordingly.
ENV ASTERISK_VERSION=releases/20

# ========================================

ENV DEBIAN_FRONTEND=noninteractive

RUN apt-get update
RUN apt-get install -y git iputils-ping traceroute
WORKDIR /usr/local/src
# Download src
RUN git clone --branch ${ASTERISK_VERSION} --single-branch --depth 1 https://github.com/asterisk/asterisk.git
# Install asterisk
WORKDIR /usr/local/src/asterisk
RUN contrib/scripts/install_prereq install
RUN ./configure
RUN make menuselect.makeopts
RUN menuselect/menuselect \
 --disable BUILD_NATIVE \
 --disable-all \
 --enable chan_bridge_media \
 --enable chan_rtp \
 --enable chan_pjsip \
 --enable bridge_native_rtp \
 --enable bridge_simple \
 --enable codec_gsm \
 --enable codec_a_mu \
 --enable codec_alaw \
 --enable codec_ulaw \
 --enable codec_opus \
 --enable codec_resample \
 --enable format_gsm \
 --enable format_wav \
 --enable format_wav_gsm \
 --enable format_pcm \
 --enable format_ogg_vorbis \
 --enable format_h264 \
 --enable format_h263 \
 --enable func_base64 \
 --enable func_callerid \
 --enable func_channel \
 --enable func_curl \
 --enable func_cut \
 --enable func_db \
 --enable func_logic \
 --enable func_math \
 --enable func_sprintf \
 --enable func_strings \
 --enable app_confbridge \
 --enable app_db \
 --enable app_dial \
 --enable app_echo \
 --enable app_exec \
 --enable app_mixmonitor \
 --enable app_originate \
 --enable app_playback \
 --enable app_playtones \
 --enable app_queue \
 --enable app_sendtext \
 --enable app_stack \
 --enable app_transfer \
 --enable app_system \
 --enable app_verbose \
 --enable app_voicemail \
 --enable app_externalivr \
 --enable pbx_config \
 --enable pbx_realtime \
 --enable res_musiconhold \
 --enable res_agi \
 --enable res_ari \
 --enable res_ari_applications \
 --enable res_ari_asterisk \
 --enable res_ari_bridges \
 --enable res_ari_channels \
 --enable res_ari_device_states \
 --enable res_ari_endpoints \
 --enable res_ari_events \
 --enable res_ari_mailboxes \
 --enable res_ari_model \
 --enable res_ari_playbacks \
 --enable res_ari_recordings \
 --enable res_ari_sounds \
 --enable res_clioriginate \
 --enable res_config_curl \
 --enable res_config_odbc \
 --enable res_curl \
 --enable res_format_attr_h263 \
 --enable res_format_attr_h264 \
 --enable res_format_attr_opus \
 --enable res_format_attr_vp8 \
 --enable res_http_post \
 --enable res_http_websocket \
 --enable res_odbc \
 --enable res_odbc_transaction \
 --enable res_parking \
 --enable res_pjproject \
 --enable res_pjsip \
 --enable res_pjsip_acl \
 --enable res_pjsip_authenticator_digest \
 --enable res_pjsip_caller_id \
 --enable res_pjsip_dialog_info_body_generator \
 --enable res_pjsip_diversion \
 --enable res_pjsip_dlg_options \
 --enable res_pjsip_dtmf_info \
 --enable res_pjsip_empty_info \
 --enable res_pjsip_endpoint_identifier_anonymous \
 --enable res_pjsip_endpoint_identifier_ip \
 --enable res_pjsip_endpoint_identifier_user \
 --enable res_pjsip_exten_state \
 --enable res_pjsip_header_funcs \
 --enable res_pjsip_logger \
 --enable res_pjsip_messaging \
 --enable res_pjsip_mwi \
 --enable res_pjsip_mwi_body_generator \
 --enable res_pjsip_nat \
 --enable res_pjsip_notify \
 --enable res_pjsip_one_touch_record_info \
 --enable res_pjsip_outbound_authenticator_digest \
 --enable res_pjsip_outbound_publish \
 --enable res_pjsip_outbound_registration \
 --enable res_pjsip_path \
 --enable res_pjsip_pidf_body_generator \
 --enable res_pjsip_pidf_digium_body_supplement \
 --enable res_pjsip_pidf_eyebeam_body_supplement \
 --enable res_pjsip_publish_asterisk \
 --enable res_pjsip_pubsub \
 --enable res_pjsip_refer \
 --enable res_pjsip_registrar \
 --enable res_pjsip_rfc3326 \
 --enable res_pjsip_sdp_rtp \
 --enable res_pjsip_send_to_voicemail \
 --enable res_pjsip_session \
 --enable res_pjsip_sips_contact \
 --enable res_pjsip_t38 \
 --enable res_pjsip_transport_websocket \
 --enable res_pjsip_xpidf_body_generator \
 --enable res_realtime \
 --enable res_rtp_asterisk \
 --enable res_sorcery_astdb \
 --enable res_sorcery_config \
 --enable res_sorcery_memory \
 --enable res_sorcery_memory_cache \
 --enable res_sorcery_realtime \
 --enable res_srtp \
 --enable OPTIONAL_API \
 --enable MOH-OPSOUND-WAV \
 --enable CORE-SOUNDS-EN-WAV \
 menuselect.makeopts
RUN	make all
RUN make install
RUN make clean

# Postinstall
RUN chmod -R 750 /var/spool/asterisk
RUN rm -rf /var/lib/apt/lists/*
RUN rm -rf /usr/local/src/asterisk

# Make own samples
WORKDIR /etc/asterisk/
COPY Docker/config/* /etc/asterisk/

# Websockets does not work without TLS
RUN	apt-get install -y openssl
RUN mkdir /etc/asterisk/crt
RUN openssl req -new -x509 -days 365 -nodes \
    -out /etc/asterisk/crt/certificate.pem \ 
    -keyout /etc/asterisk/crt/private.pem \
    -subj "/C=GB/ST=England/L=London/O=Head Office/OU=devops/CN=localhost"

# Prepare Browser Phone
RUN rm -rf /var/lib/asterisk/static-http/*

WORKDIR /usr/local/src
# Download Browser-Phone
RUN	git clone https://github.com/InnovateAsterisk/Browser-Phone.git
RUN cp -r /usr/local/src/Browser-Phone/Phone/* /var/lib/asterisk/static-http/

# Set HTTP file permissions
RUN chmod -R 744 /var/lib/asterisk/static-http/*

EXPOSE 5060/udp 8089/tcp

HEALTHCHECK --interval=60s --timeout=10s --retries=3 CMD /usr/sbin/asterisk -rx "core show sysinfo"

ENTRYPOINT ["/usr/sbin/asterisk","-f"]

CMD ["-v"]

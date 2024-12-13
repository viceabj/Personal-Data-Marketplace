;; Personal Data Vault Contract

(define-data-var next-vault-id uint u1)

(define-map vaults
  { vault-id: uint }
  {
    owner: principal,
    encrypted-data: (string-utf8 1024),
    price: uint
  }
)

(define-map data-access
  { vault-id: uint, user: principal }
  { access-granted: bool }
)

(define-constant contract-owner tx-sender)
(define-constant err-not-owner (err u100))
(define-constant err-vault-not-found (err u101))
(define-constant err-insufficient-payment (err u102))
(define-constant err-no-access (err u103))

(define-public (create-vault (encrypted-data (string-utf8 1024)) (price uint))
  (let
    ((vault-id (var-get next-vault-id)))
    (map-set vaults
      { vault-id: vault-id }
      {
        owner: tx-sender,
        encrypted-data: encrypted-data,
        price: price
      }
    )
    (var-set next-vault-id (+ vault-id u1))
    (ok vault-id)
  )
)

(define-public (update-vault-data (vault-id uint) (new-encrypted-data (string-utf8 1024)))
  (let
    ((vault (unwrap! (map-get? vaults { vault-id: vault-id }) err-vault-not-found)))
    (asserts! (is-eq tx-sender (get owner vault)) err-not-owner)
    (ok (map-set vaults
      { vault-id: vault-id }
      (merge vault { encrypted-data: new-encrypted-data })
    ))
  )
)

(define-public (update-vault-price (vault-id uint) (new-price uint))
  (let
    ((vault (unwrap! (map-get? vaults { vault-id: vault-id }) err-vault-not-found)))
    (asserts! (is-eq tx-sender (get owner vault)) err-not-owner)
    (ok (map-set vaults
      { vault-id: vault-id }
      (merge vault { price: new-price })
    ))
  )
)

(define-public (purchase-data-access (vault-id uint))
  (let
    ((vault (unwrap! (map-get? vaults { vault-id: vault-id }) err-vault-not-found)))
    (asserts! (>= (stx-get-balance tx-sender) (get price vault)) err-insufficient-payment)
    (try! (stx-transfer? (get price vault) tx-sender (get owner vault)))
    (ok (map-set data-access
      { vault-id: vault-id, user: tx-sender }
      { access-granted: true }
    ))
  )
)

(define-read-only (get-vault-data (vault-id uint))
  (let
    ((vault (unwrap! (map-get? vaults { vault-id: vault-id }) err-vault-not-found))
     (access (default-to { access-granted: false } (map-get? data-access { vault-id: vault-id, user: tx-sender }))))
    (asserts! (or (is-eq tx-sender (get owner vault)) (get access-granted access)) err-no-access)
    (ok (get encrypted-data vault))
  )
)

(define-read-only (get-vault-price (vault-id uint))
  (ok (get price (unwrap! (map-get? vaults { vault-id: vault-id }) err-vault-not-found)))
)

(define-read-only (check-data-access (vault-id uint) (user principal))
  (ok (get access-granted (default-to { access-granted: false } (map-get? data-access { vault-id: vault-id, user: user }))))
)

